-- Hardening (Supabase advisors 0028/0029): nothing SECURITY DEFINER is callable via /rest/v1/rpc.

-- Trigger functions never need to be called directly.
revoke execute on function public.guard_enquiry_insert() from public, anon, authenticated;
revoke execute on function public.handle_new_user()      from public, anon, authenticated;
revoke execute on function public.protect_last_admin()   from public, anon, authenticated;
revoke execute on function public.write_audit()          from public, anon, authenticated;

-- Role helpers are needed by RLS policies, so move them out of the exposed API schema.
-- Policies reference functions by OID, so they keep working after the move.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter function public.has_role(uuid, public.app_role) set schema private;
alter function public.is_staff(uuid) set schema private;
alter function private.has_role(uuid, public.app_role) set search_path = public;
alter function private.is_staff(uuid) set search_path = public;

-- Trigger bodies referenced public.is_staff by name; repoint them.
create or replace function public.guard_enquiry_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not private.is_staff(auth.uid()) then
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
