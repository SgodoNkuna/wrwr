-- Switching two-person approval OFF is itself a high-risk action when there are 2+ admins.

alter table public.pending_approvals drop constraint if exists pending_approvals_action_check;
alter table public.pending_approvals add constraint pending_approvals_action_check
  check (action in ('grant_admin','revoke_admin','delete_order','refund_order','anonymise_customer','disable_two_person'));

create or replace function private.guard_security_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.key = 'security' and private.api_caller()
     and coalesce((old.value->>'two_person_approval')::boolean, true)
     and not coalesce((new.value->>'two_person_approval')::boolean, true)
     and (select count(*) from public.user_roles where role = 'admin') > 1
     and current_setting('tshehla.approved_action', true) is distinct from 'on' then
    raise exception 'Switching off two-person approval needs a second admin to approve it (Admin → Approvals).';
  end if;
  return new;
end $$;
revoke execute on function private.guard_security_settings() from public, anon, authenticated;
drop trigger if exists trg_guard_security on public.site_settings;
create trigger trg_guard_security before update on public.site_settings
  for each row execute function private.guard_security_settings();

create or replace function private.execute_approval(p public.pending_approvals)
returns text language plpgsql security definer set search_path = public as $$
declare n int; digits text; o_ids text[]; e_ids text[];
begin
  perform set_config('tshehla.approved_action', 'on', true);
  if p.action = 'grant_admin' then
    insert into public.user_roles (user_id, role) values (p.target_id::uuid, 'admin') on conflict do nothing;
    get diagnostics n = row_count;
  elsif p.action = 'revoke_admin' then
    delete from public.user_roles where user_id = p.target_id::uuid and role = 'admin';
    get diagnostics n = row_count;
  elsif p.action = 'delete_order' then
    delete from public.orders where id = p.target_id::uuid;
    get diagnostics n = row_count;
  elsif p.action = 'refund_order' then
    update public.orders set payment_status = 'refunded' where id = p.target_id::uuid and payment_status = 'paid';
    get diagnostics n = row_count;
  elsif p.action = 'disable_two_person' then
    update public.site_settings set value = value || '{"two_person_approval": false}' where key = 'security';
    get diagnostics n = row_count;
  elsif p.action = 'anonymise_customer' then
    if p.target_id like 'phone:%' then
      digits := substr(p.target_id, 7);
      select coalesce(array_agg(id::text), '{}') into o_ids from public.orders where right(regexp_replace(phone, '\D', '', 'g'), 9) = digits;
      select coalesce(array_agg(id::text), '{}') into e_ids from public.enquiries where right(regexp_replace(phone, '\D', '', 'g'), 9) = digits;
    else
      select coalesce(array_agg(id::text), '{}') into o_ids from public.orders where customer_id = p.target_id::uuid;
      select coalesce(array_agg(id::text), '{}') into e_ids from public.enquiries where customer_id = p.target_id::uuid;
    end if;
    update public.orders set customer_name = 'Anonymised', phone = '000000000', email = null, delivery_address = null, notes = null, customer_id = null
      where id::text = any(o_ids);
    get diagnostics n = row_count;
    update public.enquiries set name = 'Anonymised', phone = '000000000', email = null, message = '[removed at customer request]', customer_id = null
      where id::text = any(e_ids);
    update public.audit_logs set old_data = null, new_data = null
      where record_id = any(o_ids || e_ids || array[p.target_id]);
    if p.target_id not like 'phone:%' then
      update public.data_requests set email = 'anonymised', details = null where user_id = p.target_id::uuid;
      delete from auth.users where id = p.target_id::uuid and not exists (select 1 from public.user_roles r where r.user_id = p.target_id::uuid);
    end if;
  end if;
  perform set_config('tshehla.approved_action', 'off', true);
  return format('%s: %s row(s) affected', p.action, coalesce(n, 0));
end $$;
revoke execute on function private.execute_approval(public.pending_approvals) from public, anon, authenticated;

create or replace function public.request_approval(p_action text, p_target text, p_reason text)
returns public.pending_approvals
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_summary text;
  v_row public.pending_approvals;
  v_two_person boolean := coalesce((select (value->>'two_person_approval')::boolean from public.site_settings where key = 'security'), true);
begin
  if not private.has_role(me, 'admin') then raise exception 'Only admins can request this.'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then raise exception 'Please give a reason.'; end if;

  if p_action in ('grant_admin', 'revoke_admin') then
    select format('%s admin access for %s', case when p_action = 'grant_admin' then 'Give' else 'Remove' end, email) into v_summary
      from public.profiles where id = p_target::uuid;
    if v_summary is null then raise exception 'User not found.'; end if;
    if p_action = 'grant_admin' and exists (select 1 from public.user_roles where user_id = p_target::uuid and role = 'admin') then raise exception 'Already an admin.'; end if;
    if p_action = 'revoke_admin' and not exists (select 1 from public.user_roles where user_id = p_target::uuid and role = 'admin') then raise exception 'Not an admin.'; end if;
  elsif p_action in ('delete_order', 'refund_order') then
    select format('%s order %s (%s, R%s)', case when p_action = 'delete_order' then 'Delete' else 'Refund' end,
                  reference, customer_name, to_char(total_cents / 100.0, 'FM999999990.00')) into v_summary
      from public.orders where id = p_target::uuid and (p_action = 'delete_order' or payment_status = 'paid');
    if v_summary is null then raise exception 'Order not found (or not paid, for a refund).'; end if;
  elsif p_action = 'disable_two_person' then
    if not v_two_person then raise exception 'Two-person approval is already off.'; end if;
    v_summary := 'Switch off two-person approval for high-risk actions';
    p_target := 'security';
  elsif p_action = 'anonymise_customer' then
    if p_target like 'phone:%' then
      if substr(p_target, 7) !~ '^[0-9]{9}$' then raise exception 'Bad phone target.'; end if;
      v_summary := format('Anonymise all orders and enquiries for cellphone ending %s', substr(p_target, 7));
    else
      select format('Anonymise and delete the account of %s', email) into v_summary from public.profiles where id = p_target::uuid;
      if v_summary is null then raise exception 'User not found.'; end if;
      if exists (select 1 from public.user_roles where user_id = p_target::uuid) then raise exception 'Remove their staff roles first.'; end if;
    end if;
  else
    raise exception 'Unknown action.';
  end if;

  if exists (select 1 from public.pending_approvals where action = p_action and target_id = p_target and status = 'pending') then
    raise exception 'There is already a pending request for this.';
  end if;

  insert into public.pending_approvals (action, target_id, summary, reason, requested_by, requested_by_email)
  values (p_action, p_target, v_summary, btrim(p_reason), me, (select email from public.profiles where id = me))
  returning * into v_row;

  if not v_two_person then
    update public.pending_approvals set status = 'executed', decided_by = me, decided_by_email = v_row.requested_by_email,
      decided_at = now(), decision_note = 'two-person approval is switched off', result = private.execute_approval(v_row)
    where id = v_row.id returning * into v_row;
  end if;
  return v_row;
end $$;
revoke execute on function public.request_approval(text, text, text) from public, anon;
grant execute on function public.request_approval(text, text, text) to authenticated;
