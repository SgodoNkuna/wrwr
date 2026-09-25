-- Tshehla AgriHub: core schema, roles, RLS, audit log, storage.

create extension if not exists pgcrypto;

-- ── Roles ────────────────────────────────────────────────────────────────
do $$ begin
  create type public.app_role as enum ('admin', 'editor');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Single source of truth for authorization; used by every policy.
create or replace function public.has_role(_uid uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role = _role)
$$;

create or replace function public.is_staff(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid)
$$;


create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Never allow the last admin to be removed (prevents lock-out).
create or replace function public.protect_last_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin'
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'Cannot remove the last admin';
  end if;
  return old;
end $$;

drop trigger if exists trg_protect_last_admin on public.user_roles;
create trigger trg_protect_last_admin before delete on public.user_roles
  for each row execute function public.protect_last_admin();

-- ── Catalogue ────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  name text not null check (char_length(name) between 1 and 120),
  summary text check (char_length(summary) <= 300),
  description text check (char_length(description) <= 5000),
  image_url text check (char_length(image_url) <= 1000),
  unit text check (char_length(unit) <= 60),
  price_cents int check (price_cents is null or price_cents >= 0),
  show_price boolean not null default false,
  in_stock boolean not null default true,
  featured boolean not null default false,
  published boolean not null default true,
  highlights text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 3000),
  image_url text check (char_length(image_url) <= 1000),
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key check (key ~ '^[a-z_]{1,60}$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── Enquiries ────────────────────────────────────────────────────────────
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  phone text not null check (phone ~ '^\+?[0-9 ()-]{9,20}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text not null check (char_length(btrim(message)) between 2 and 2000),
  quantity text check (char_length(quantity) <= 60),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  admin_notes text check (char_length(admin_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists enquiries_created_idx on public.enquiries(created_at desc);

-- Spam guard: public inserts are forced to status 'new', and capped per phone + globally.
create or replace function public.guard_enquiry_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then
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

drop trigger if exists trg_guard_enquiry on public.enquiries;
create trigger trg_guard_enquiry before insert on public.enquiries
  for each row execute function public.guard_enquiry_insert();

-- ── updated_at ───────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['categories','products','services','site_settings','enquiries'] loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ── Audit log ────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

create or replace function public.write_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  -- Anonymous enquiry submissions are not audited; everything staff does is.
  if auth.uid() is null and tg_table_name = 'enquiries' then
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

do $$ declare t text; begin
  foreach t in array array['categories','products','services','site_settings','enquiries','user_roles'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.write_audit()', t);
  end loop;
end $$;

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.user_roles    enable row level security;
alter table public.categories    enable row level security;
alter table public.products      enable row level security;
alter table public.services      enable row level security;
alter table public.site_settings enable row level security;
alter table public.enquiries     enable row level security;
alter table public.audit_logs    enable row level security;

-- profiles: users read their own row, staff read all, users edit only their own.
create policy "profiles_self_read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "profiles_self_update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- user_roles: users read their own; admins manage everyone's.
create policy "roles_read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "roles_admin_insert" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "roles_admin_delete" on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Catalogue: public reads published rows; staff read and write everything.
create policy "categories_public_read" on public.categories for select to anon, authenticated
  using (published or public.is_staff(auth.uid()));
create policy "categories_staff_write" on public.categories for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy "products_public_read" on public.products for select to anon, authenticated
  using (published or public.is_staff(auth.uid()));
create policy "products_staff_write" on public.products for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy "services_public_read" on public.services for select to anon, authenticated
  using (published or public.is_staff(auth.uid()));
create policy "services_staff_write" on public.services for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Settings: public read; only admins change them.
create policy "settings_public_read" on public.site_settings for select to anon, authenticated
  using (true);
create policy "settings_admin_write" on public.site_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Enquiries: anyone may submit; only staff can read or work them; only admins delete.
create policy "enquiries_public_insert" on public.enquiries for insert to anon, authenticated
  with check (true);
create policy "enquiries_staff_read" on public.enquiries for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "enquiries_staff_update" on public.enquiries for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "enquiries_admin_delete" on public.enquiries for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Audit logs: admins read only. No write policies, so rows come only from the trigger.
create policy "audit_admin_read" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Anonymous users must not read enquiries back (the insert returns no row to them).
revoke select on public.enquiries from anon;
revoke all on public.audit_logs from anon;

-- ── Storage ──────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "product_images_staff_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_staff(auth.uid()));
create policy "product_images_staff_update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_staff(auth.uid()));
create policy "product_images_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_staff(auth.uid()));
