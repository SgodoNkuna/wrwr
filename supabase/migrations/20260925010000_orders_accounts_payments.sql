-- Online ordering, customer accounts and a payments placeholder.
-- Prices, totals and stock are computed server-side in place_order(); the browser only sends
-- product ids and quantities. Nothing is ever marked "paid" except by staff or the verified
-- PayFast webhook (edge function, disabled until keys are configured).

-- ── Products: online ordering + stock ───────────────────────────────────
alter table public.products
  add column if not exists orderable boolean not null default false,
  add column if not exists stock_qty int check (stock_qty is null or stock_qty >= 0),
  add column if not exists max_per_order int not null default 20 check (max_per_order between 1 and 1000);

-- ── Profiles: phone; users may only edit their own name/phone ───────────
alter table public.profiles
  add column if not exists phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{9,20}$');

revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_phone text := new.raw_user_meta_data->>'phone';
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email, left(new.raw_user_meta_data->>'full_name', 100),
          case when v_phone ~ '^\+?[0-9 ()-]{9,20}$' then v_phone end)
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── Enquiries: link to the signed-in customer ───────────────────────────
alter table public.enquiries
  add column if not exists customer_id uuid references auth.users(id) on delete set null;
create index if not exists enquiries_customer_idx on public.enquiries(customer_id);

create or replace function public.guard_enquiry_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not private.is_staff(auth.uid()) then
    if not coalesce(new.consent, false) then
      raise exception 'Consent is required to process your enquiry.';
    end if;
    new.customer_id := auth.uid();
    new.consent_at := now();
    new.status := 'new';
    new.admin_notes := null;
    if (select count(*) from public.enquiries
        where phone = new.phone and created_at > now() - interval '1 hour') >= 3 then
      raise exception 'Too many enquiries from this number. Please WhatsApp us instead.';
    end if;
    if (select count(*) from public.enquiries
        where created_at > now() - interval '1 minute') >= 20 then
      raise exception 'We are receiving a lot of enquiries. Please try again shortly.';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_enquiry_insert() from public, anon, authenticated;

drop policy if exists "enquiries_staff_read" on public.enquiries;
create policy "enquiries_read" on public.enquiries for select to authenticated
  using (customer_id = (select auth.uid()) or private.is_staff((select auth.uid())));

-- ── Orders ───────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 100),
  phone text not null check (phone ~ '^\+?[0-9 ()-]{9,20}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  fulfilment text not null default 'collect' check (fulfilment in ('collect','delivery')),
  delivery_address text check (char_length(delivery_address) <= 500),
  notes text check (char_length(notes) <= 1000),
  subtotal_cents int not null default 0 check (subtotal_cents >= 0),
  delivery_cents int not null default 0 check (delivery_cents >= 0),
  total_cents int not null default 0 check (total_cents >= 0),
  payment_method text not null check (payment_method in ('payfast','eft','cash')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','refunded','failed')),
  payment_reference text check (char_length(payment_reference) <= 100),
  paid_at timestamptz,
  status text not null default 'new' check (status in ('new','confirmed','ready','completed','cancelled')),
  admin_notes text check (char_length(admin_notes) <= 2000),
  consent_at timestamptz not null,
  terms_accepted_at timestamptz not null,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_customer_idx on public.orders(customer_id);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit text,
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity int not null check (quantity between 1 and 1000),
  line_total_cents int not null check (line_total_cents >= 0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);

create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  order_id uuid references public.orders(id) on delete set null,
  provider text not null,
  event text not null,
  payload jsonb,
  signature_valid boolean,
  processed boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists payment_events_order_idx on public.payment_events(order_id);

-- ── POPIA data-subject requests ──────────────────────────────────────────
create table if not exists public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  kind text not null check (kind in ('access','correction','deletion','objection')),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','in_progress','done','rejected')),
  admin_notes text check (char_length(admin_notes) <= 2000),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists data_requests_user_idx on public.data_requests(user_id);

create or replace function public.guard_data_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not private.is_staff(auth.uid()) then
    new.user_id := auth.uid();
    new.email := (select email from public.profiles where id = auth.uid());
    new.status := 'open';
    new.admin_notes := null;
    new.resolved_at := null;
    if (select count(*) from public.data_requests
        where user_id = auth.uid() and created_at > now() - interval '1 day') >= 3 then
      raise exception 'You have already sent several requests today. We will be in touch.';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_data_request() from public, anon, authenticated;
drop trigger if exists trg_guard_data_request on public.data_requests;
create trigger trg_guard_data_request before insert on public.data_requests
  for each row execute function public.guard_data_request();

-- ── Cancelling an order puts tracked stock back ──────────────────────────
create or replace function public.restock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products p
    set stock_qty = p.stock_qty + i.qty, in_stock = true
    from (select product_id, sum(quantity) qty from public.order_items
          where order_id = new.id group by product_id) i
    where p.id = i.product_id and p.stock_qty is not null;
  end if;
  return new;
end $$;
revoke execute on function public.restock_on_cancel() from public, anon, authenticated;
drop trigger if exists trg_restock_on_cancel on public.orders;
create trigger trg_restock_on_cancel after update of status on public.orders
  for each row execute function public.restock_on_cancel();

-- ── updated_at + audit on the new tables ─────────────────────────────────
do $$ declare t text; begin
  foreach t in array array['orders','data_requests'] loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.write_audit()', t);
  end loop;
end $$;

-- Customer submissions are not staff actions, so don't audit them.
create or replace function public.write_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if tg_table_name in ('enquiries','orders','data_requests') and tg_op = 'INSERT'
     and not private.is_staff(auth.uid()) then
    return null;
  end if;
  insert into public.audit_logs (actor_id, actor_email, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(rec->>'id', rec->>'key', rec->>'user_id'),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;
revoke execute on function public.write_audit() from public, anon, authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.payment_events enable row level security;
alter table public.data_requests  enable row level security;

-- Orders are created only through place_order(); customers read their own; staff manage.
create policy "orders_read" on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or private.is_staff((select auth.uid())));
create policy "orders_staff_update" on public.orders for update to authenticated
  using (private.is_staff((select auth.uid()))) with check (private.is_staff((select auth.uid())));
create policy "orders_admin_delete" on public.orders for delete to authenticated
  using (private.has_role((select auth.uid()), 'admin'));

create policy "order_items_read" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = (select auth.uid()) or private.is_staff((select auth.uid())))));

create policy "payment_events_admin_read" on public.payment_events for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'));

create policy "data_requests_read" on public.data_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff((select auth.uid())));
create policy "data_requests_insert" on public.data_requests for insert to authenticated
  with check (true);
create policy "data_requests_staff_update" on public.data_requests for update to authenticated
  using (private.is_staff((select auth.uid()))) with check (private.is_staff((select auth.uid())));

revoke all on public.orders, public.order_items, public.payment_events, public.data_requests from anon;

-- ── place_order(): the only way to create an order ───────────────────────
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
      where o.phone = v_phone and o.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many orders from this number. Please WhatsApp us.';
  end if;
  if (select count(*) from public.orders o where o.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'We are receiving a lot of orders. Please try again shortly.';
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

  update public.orders o set subtotal_cents = v_sub, total_cents = v_sub where o.id = v_id;
  return query select v_id, v_ref, v_sub, v_method;
end $$;
revoke execute on function public.place_order(jsonb, jsonb) from public;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;

-- ── track_order(): guests check status with reference + phone ────────────
create or replace function public.track_order(p_reference text, p_phone text)
returns table (reference text, status text, payment_status text, payment_method text,
               fulfilment text, total_cents int, created_at timestamptz, items jsonb)
language sql stable security definer set search_path = public as $$
  select o.reference, o.status, o.payment_status, o.payment_method, o.fulfilment, o.total_cents, o.created_at,
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

-- ── Payment settings (public: bank details are shown to customers) ──────
-- Merchant keys and passphrase are NEVER stored here; they live in edge-function secrets.
insert into public.site_settings (key, value) values ('payments', jsonb_build_object(
  'online_enabled', false,
  'provider', 'payfast',
  'eft_enabled', true,
  'cash_enabled', true,
  'bank_name', '',
  'account_name', '',
  'account_number', '',
  'branch_code', '',
  'eft_note', 'Use your order number as the payment reference and send proof of payment on WhatsApp.',
  'delivery_note', 'Collection is at the farm. Delivery can be arranged; we will confirm the cost on WhatsApp.'
)) on conflict (key) do nothing;

-- Online ordering on by default for the priced, countable lines.
update public.products set orderable = true
where slug in ('broiler-chicks','brahma-chickens','ducks','turkeys','green-peppers','green-beans');

-- ── Retention: orders are financial records (5 years), requests 3 years ─
create or replace function private.purge_expired_personal_data()
returns void language sql security definer set search_path = public as $$
  delete from public.enquiries     where created_at < now() - interval '24 months';
  delete from public.audit_logs    where created_at < now() - interval '36 months';
  delete from public.data_requests where created_at < now() - interval '36 months';
  delete from public.payment_events where created_at < now() - interval '60 months';
  delete from public.orders        where created_at < now() - interval '60 months';
$$;
revoke execute on function private.purge_expired_personal_data() from public, anon, authenticated;
