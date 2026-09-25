-- POPIA: record consent on every public enquiry, and purge old personal data automatically.

alter table public.enquiries
  add column if not exists consent boolean not null default false,
  add column if not exists consent_at timestamptz;

-- Public submissions must carry consent; the timestamp comes from the server, not the browser.
create or replace function public.guard_enquiry_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not private.is_staff(auth.uid()) then
    if not coalesce(new.consent, false) then
      raise exception 'Consent is required to process your enquiry.';
    end if;
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

-- Retention (matches the privacy policy): enquiries 24 months, audit log 36 months.
create or replace function private.purge_expired_personal_data()
returns void language sql security definer set search_path = public as $$
  delete from public.enquiries  where created_at < now() - interval '24 months';
  delete from public.audit_logs where created_at < now() - interval '36 months';
$$;
revoke execute on function private.purge_expired_personal_data() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('purge-expired-personal-data', '17 2 * * *', 'select private.purge_expired_personal_data()');
