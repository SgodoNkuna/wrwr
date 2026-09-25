-- Order operations: stock-hold protection, delivery charges, price dates, bot check.

create extension if not exists http with schema extensions;

update public.site_settings set value = jsonb_build_object('hold_hours', 48, 'cash_hold_hours', 72) || value
where key = 'payments';
update public.site_settings set value = jsonb_build_object('captcha_site_key', '') || value
where key = 'security';

-- ── Delivery charge: totals are always subtotal + delivery, set by the database ──
create or replace function private.order_totals()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if private.api_caller() and new.subtotal_cents is distinct from old.subtotal_cents
     and current_setting('tshehla.order_totals', true) is distinct from 'on' then
    raise exception 'Order line totals can''t be edited.';
  end if;
  if new.delivery_cents is distinct from old.delivery_cents and old.payment_status = 'paid' then
    raise exception 'This order is already paid, so the delivery charge can''t change.';
  end if;
  new.total_cents := new.subtotal_cents + new.delivery_cents;
  return new;
end $$;
revoke execute on function private.order_totals() from public, anon, authenticated;
drop trigger if exists trg_order_totals on public.orders;
create trigger trg_order_totals before update on public.orders
  for each row execute function private.order_totals();

-- ── Price board date only moves when a price actually changes ────────────
alter table public.products add column if not exists price_updated_at timestamptz not null default now();
update public.products set price_updated_at = updated_at;
create or replace function private.touch_price_date()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.price_cents is distinct from old.price_cents or new.show_price is distinct from old.show_price then
    new.price_updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists trg_price_date on public.products;
create trigger trg_price_date before update on public.products
  for each row execute function private.touch_price_date();

-- ── Bot check (Cloudflare Turnstile) ─────────────────────────────────────
-- Enforced only once a secret key is stored in Vault (Admin → Payments → "I'm human" check).
create or replace function private.captcha_ok(p_token text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_secret text; v_resp extensions.http_response;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'turnstile_secret_key';
  if coalesce(v_secret, '') = '' then return true; end if;
  if p_token is null or length(p_token) < 10 then return false; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '6');
  select * into v_resp from extensions.http_post(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    'secret=' || extensions.urlencode(v_secret) || '&response=' || extensions.urlencode(p_token),
    'application/x-www-form-urlencoded');
  return v_resp.status = 200 and coalesce((v_resp.content::jsonb->>'success')::boolean, false);
exception when others then
  return false; -- fail closed
end $$;
revoke execute on function private.captcha_ok(text) from public, anon, authenticated;

-- Admins paste the Turnstile keys in the admin; the secret goes straight into Vault.
create or replace function public.set_turnstile_keys(p_site_key text, p_secret text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not private.has_role(auth.uid(), 'admin') then raise exception 'Only admins can change this.'; end if;
  select id into v_id from vault.secrets where name = 'turnstile_secret_key';
  if coalesce(btrim(p_site_key), '') = '' or coalesce(btrim(p_secret), '') = '' then
    if v_id is not null then delete from vault.secrets where id = v_id; end if;
    update public.site_settings set value = value || '{"captcha_site_key": ""}' where key = 'security';
    return;
  end if;
  if v_id is null then
    perform vault.create_secret(btrim(p_secret), 'turnstile_secret_key', 'Cloudflare Turnstile secret for checkout');
  else
    perform vault.update_secret(v_id, btrim(p_secret));
  end if;
  update public.site_settings set value = value || jsonb_build_object('captcha_site_key', btrim(p_site_key)) where key = 'security';
end $$;
revoke execute on function public.set_turnstile_keys(text, text) from public, anon;
grant execute on function public.set_turnstile_keys(text, text) to authenticated;

-- ── place_order v2: bot check + tighter limits ───────────────────────────
create or replace function public.place_order(p_items jsonb, p_customer jsonb)
returns table (order_id uuid, reference text, total_cents int, payment_method text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_pay jsonb := coalesce((select value from public.site_settings where key = 'payments'), '{}');
  v_method text := p_customer->>'payment_method';
  v_phone text := btrim(coalesce(p_customer->>'phone', ''));
  v_id uuid := gen_random_uuid();
  v_ref text;
  v_sub int := 0;
  v_line record;
  v_prod public.products%rowtype;
begin
  if v_method is null or v_method not in ('payfast','eft','cash') then
    raise exception 'Please choose a payment method.';
  end if;
  if v_method = 'payfast' and not coalesce((v_pay->>'online_enabled')::boolean, false) then
    raise exception 'Online payment is not available yet. Please choose EFT or pay on collection.';
  end if;
  if v_method = 'eft' and not coalesce((v_pay->>'eft_enabled')::boolean, true) then
    raise exception 'EFT is not available right now.';
  end if;
  if v_method = 'cash' and not coalesce((v_pay->>'cash_enabled')::boolean, true) then
    raise exception 'Pay on collection is not available right now.';
  end if;
  if not coalesce((p_customer->>'consent')::boolean, false) then
    raise exception 'Consent is required to process your order.';
  end if;
  if not coalesce((p_customer->>'accept_terms')::boolean, false) then
    raise exception 'Please accept the Terms of Use and Orders & Returns policy.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your order is empty.';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'Too many different items in one order.';
  end if;
  if (select count(*) from public.orders o
      where right(regexp_replace(o.phone, '\D', '', 'g'), 9) = right(regexp_replace(v_phone, '\D', '', 'g'), 9)
        and o.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many orders from this number. Please WhatsApp us.';
  end if;
  if (select count(*) from public.orders o where o.created_at > now() - interval '1 minute') >= 10
     or (select count(*) from public.orders o where o.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'We are receiving a lot of orders. Please try again shortly or WhatsApp us.';
  end if;
  if not private.captcha_ok(p_customer->>'captcha_token') then
    raise exception 'Please complete the "I''m human" check and try again.';
  end if;

  for i in 1..5 loop
    v_ref := 'TA-' || to_char(now() at time zone 'Africa/Johannesburg', 'YYMMDD') || '-'
             || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 5));
    exit when not exists (select 1 from public.orders o where o.reference = v_ref);
  end loop;

  insert into public.orders (id, reference, customer_id, customer_name, phone, email, fulfilment,
    delivery_address, notes, payment_method, payment_status, consent_at, terms_accepted_at)
  values (v_id, v_ref, auth.uid(), btrim(p_customer->>'name'), v_phone,
    nullif(btrim(coalesce(p_customer->>'email', '')), ''),
    coalesce(nullif(p_customer->>'fulfilment', ''), 'collect'),
    nullif(btrim(coalesce(p_customer->>'delivery_address', '')), ''),
    nullif(btrim(coalesce(p_customer->>'notes', '')), ''),
    v_method, case when v_method = 'payfast' then 'pending' else 'unpaid' end, now(), now());

  for v_line in
    select (e->>'product_id')::uuid as pid, (e->>'quantity')::int as qty
    from jsonb_array_elements(p_items) e
  loop
    select * into v_prod from public.products p where p.id = v_line.pid for update;
    if not found or not v_prod.published or not v_prod.orderable or not v_prod.in_stock
       or not v_prod.show_price or v_prod.price_cents is null then
      raise exception '% is not available to order online. Please enquire instead.',
        coalesce(v_prod.name, 'One of the items');
    end if;
    if v_line.qty is null or v_line.qty < 1 or v_line.qty > v_prod.max_per_order then
      raise exception 'You can order between 1 and % of %.', v_prod.max_per_order, v_prod.name;
    end if;
    if v_prod.stock_qty is not null then
      if v_prod.stock_qty < v_line.qty then
        raise exception 'Only % left of %.', v_prod.stock_qty, v_prod.name;
      end if;
      update public.products p set stock_qty = p.stock_qty - v_line.qty,
        in_stock = (p.stock_qty - v_line.qty) > 0
      where p.id = v_prod.id;
    end if;
    insert into public.order_items (order_id, product_id, product_name, unit, unit_price_cents, quantity, line_total_cents)
    values (v_id, v_prod.id, v_prod.name, v_prod.unit, v_prod.price_cents, v_line.qty, v_prod.price_cents * v_line.qty);
    v_sub := v_sub + v_prod.price_cents * v_line.qty;
  end loop;

  -- The totals trigger blocks subtotal edits from the website; this function is the one exception.
  perform set_config('tshehla.order_totals', 'on', true);
  update public.orders o set subtotal_cents = v_sub where o.id = v_id;
  perform set_config('tshehla.order_totals', 'off', true);
  return query select v_id, v_ref, v_sub, v_method;
end $$;
revoke execute on function public.place_order(jsonb, jsonb) from public;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;

-- ── track_order v2: include delivery and subtotal ────────────────────────
drop function if exists public.track_order(text, text);
create function public.track_order(p_reference text, p_phone text)
returns table (reference text, status text, payment_status text, payment_method text, fulfilment text,
               subtotal_cents int, delivery_cents int, total_cents int, created_at timestamptz, items jsonb)
language sql stable security definer set search_path = public as $$
  select o.reference, o.status, o.payment_status, o.payment_method, o.fulfilment,
    o.subtotal_cents, o.delivery_cents, o.total_cents, o.created_at,
    (select coalesce(jsonb_agg(jsonb_build_object('name', i.product_name, 'unit', i.unit,
       'quantity', i.quantity, 'line_total_cents', i.line_total_cents) order by i.id), '[]')
     from public.order_items i where i.order_id = o.id)
  from public.orders o
  where o.reference = upper(btrim(p_reference))
    and right(regexp_replace(o.phone, '\D', '', 'g'), 9) = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9)
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 9
$$;
revoke execute on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- ── Unpaid orders don't hold stock forever ───────────────────────────────
create or replace function private.expire_unpaid_orders()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_pay jsonb := coalesce((select value from public.site_settings where key = 'payments'), '{}');
  v_hold interval := make_interval(hours => coalesce((v_pay->>'hold_hours')::int, 48));
  v_cash_hold interval := make_interval(hours => coalesce((v_pay->>'cash_hold_hours')::int, 72));
  n int;
begin
  update public.orders o
  set status = 'cancelled',
      admin_notes = concat_ws(E'\n', o.admin_notes, format('Auto-cancelled %s: not %s in time; stock released.',
        to_char(now() at time zone 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI'),
        case when o.payment_method = 'cash' then 'confirmed' else 'paid' end))
  where o.status = 'new' and not o.is_test and o.payment_status in ('unpaid', 'pending', 'failed')
    and ((o.payment_method in ('eft', 'payfast') and o.created_at < now() - v_hold)
      or (o.payment_method = 'cash' and o.created_at < now() - v_cash_hold));
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function private.expire_unpaid_orders() from public, anon, authenticated;
select cron.schedule('expire-unpaid-orders', '*/15 * * * *', 'select private.expire_unpaid_orders()');
