-- Staff MFA (TOTP) and two-person approval for high-risk admin actions.

insert into public.site_settings (key, value) values ('security', jsonb_build_object(
  'require_staff_mfa', false,
  'two_person_approval', true
)) on conflict (key) do nothing;

-- ── MFA-aware role checks ────────────────────────────────────────────────
-- A staff member who has enrolled an authenticator must be at AAL2 (code entered this session)
-- for their role to count. If "require_staff_mfa" is on, every staff member must be at AAL2.
create or replace function private.mfa_ok()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
      or (not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
          and not coalesce((select (s.value->>'require_staff_mfa')::boolean from public.site_settings s where s.key = 'security'), false));
$$;
revoke execute on function private.mfa_ok() from public, anon;
grant execute on function private.mfa_ok() to authenticated;

create or replace function private.has_role(_uid uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role = _role)
     and (_uid is distinct from auth.uid() or private.mfa_ok())
$$;

create or replace function private.is_staff(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid)
     and (_uid is distinct from auth.uid() or private.mfa_ok())
$$;

-- True when the current statement comes from the website/API (anon or signed-in user),
-- false for the SQL editor, migrations, cron and service-role jobs.
create or replace function private.api_caller()
returns boolean language sql stable as $$
  select coalesce(auth.role(), '') in ('anon', 'authenticated')
$$;

-- ── Two-person approval ──────────────────────────────────────────────────
create table if not exists public.pending_approvals (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('grant_admin','revoke_admin','delete_order','refund_order','anonymise_customer')),
  target_id text not null check (char_length(target_id) <= 100),
  summary text not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  status text not null default 'pending' check (status in ('pending','executed','rejected','failed','expired')),
  requested_by uuid references auth.users(id) on delete set null,
  requested_by_email text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_by_email text,
  decision_note text check (char_length(decision_note) <= 500),
  result text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists pending_approvals_status_idx on public.pending_approvals(status, created_at desc);
create index if not exists pending_approvals_requested_by_idx on public.pending_approvals(requested_by);
create index if not exists pending_approvals_decided_by_idx on public.pending_approvals(decided_by);
alter table public.pending_approvals enable row level security;
-- Read-only for admins; rows change only through request_approval()/decide_approval().
create policy "approvals_admin_read" on public.pending_approvals for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'));
revoke all on public.pending_approvals from anon;

drop trigger if exists trg_audit on public.pending_approvals;
create trigger trg_audit after insert or update or delete on public.pending_approvals
  for each row execute function public.write_audit();

-- Guard: these changes are only possible from the website via an approved request.
create or replace function private.require_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if private.api_caller() and current_setting('tshehla.approved_action', true) is distinct from 'on' then
    if tg_table_name = 'user_roles' then
      if coalesce(new.role, old.role) = 'admin' then
        raise exception 'Admin role changes need a second admin to approve them (Admin → Approvals).';
      end if;
    elsif tg_op = 'DELETE' then
      raise exception 'Deleting an order needs a second admin to approve it (Admin → Approvals).';
    elsif new.payment_status = 'refunded' and old.payment_status <> 'refunded' then
      raise exception 'Refunds need a second admin to approve them (Admin → Approvals).';
    end if;
  end if;
  return coalesce(new, old);
end $$;
revoke execute on function private.require_approval() from public, anon, authenticated;

drop trigger if exists trg_require_approval on public.user_roles;
create trigger trg_require_approval before insert or delete on public.user_roles
  for each row execute function private.require_approval();
drop trigger if exists trg_require_approval_delete on public.orders;
create trigger trg_require_approval_delete before delete on public.orders
  for each row execute function private.require_approval();
drop trigger if exists trg_require_approval_refund on public.orders;
create trigger trg_require_approval_refund before update of payment_status on public.orders
  for each row execute function private.require_approval();

-- Executes an approved action. Only called from decide_approval()/request_approval().
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
  elsif p.action = 'anonymise_customer' then
    -- POPIA erasure: strip personal details, keep amounts for tax records, scrub audit
    -- snapshots of those rows, then remove the login.
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

  -- Owner switched two-person approval off: run straight away (still fully audited).
  if not v_two_person then
    update public.pending_approvals set status = 'executed', decided_by = me, decided_by_email = v_row.requested_by_email,
      decided_at = now(), decision_note = 'two-person approval is switched off', result = private.execute_approval(v_row)
    where id = v_row.id returning * into v_row;
  end if;
  return v_row;
end $$;
revoke execute on function public.request_approval(text, text, text) from public, anon;
grant execute on function public.request_approval(text, text, text) to authenticated;

create or replace function public.decide_approval(p_id uuid, p_approve boolean, p_note text default null)
returns public.pending_approvals
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_row public.pending_approvals;
  v_admins int := (select count(*) from public.user_roles where role = 'admin');
begin
  if not private.has_role(me, 'admin') then raise exception 'Only admins can approve requests.'; end if;
  select * into v_row from public.pending_approvals where id = p_id for update;
  if not found then raise exception 'Request not found.'; end if;
  if v_row.status <> 'pending' then raise exception 'This request was already %.', v_row.status; end if;
  if v_row.created_at < now() - interval '7 days' then
    update public.pending_approvals set status = 'expired', decided_at = now() where id = p_id returning * into v_row;
    return v_row;
  end if;
  if p_approve and v_row.requested_by = me
     and not (v_admins = 1 and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2') then
    raise exception 'A different admin must approve this. (A sole admin can self-approve only after signing in with a verification code.)';
  end if;

  if not p_approve then
    update public.pending_approvals set status = 'rejected', decided_by = me, decided_at = now(), decision_note = p_note,
      decided_by_email = (select email from public.profiles where id = me)
    where id = p_id returning * into v_row;
    return v_row;
  end if;

  begin
    update public.pending_approvals set status = 'executed', decided_by = me, decided_at = now(), decision_note = p_note,
      decided_by_email = (select email from public.profiles where id = me), result = private.execute_approval(v_row)
    where id = p_id returning * into v_row;
  exception when others then
    update public.pending_approvals set status = 'failed', decided_by = me, decided_at = now(), decision_note = p_note,
      decided_by_email = (select email from public.profiles where id = me), result = sqlerrm
    where id = p_id returning * into v_row;
  end;
  return v_row;
end $$;
revoke execute on function public.decide_approval(uuid, boolean, text) from public, anon;
grant execute on function public.decide_approval(uuid, boolean, text) to authenticated;
