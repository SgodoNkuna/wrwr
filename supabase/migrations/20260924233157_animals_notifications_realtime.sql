-- Livestock listings, staff/customer notifications, realtime for the admin.

-- ── Individual animals (or groups, e.g. "10 weaners") ────────────────────
create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  tag text not null check (char_length(btrim(tag)) between 1 and 40),
  title text check (char_length(title) <= 120),
  breed text check (char_length(breed) <= 80),
  sex text check (sex in ('male', 'female', 'mixed')),
  age_months int check (age_months between 0 and 600),
  weight_kg numeric(6,1) check (weight_kg > 0),
  quantity int not null default 1 check (quantity between 1 and 500),
  price_cents int check (price_cents is null or price_cents >= 0),
  show_price boolean not null default false,
  status text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  image_url text check (char_length(image_url) <= 1000),
  notes text check (char_length(notes) <= 2000),
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists animals_product_idx on public.animals(product_id);
alter table public.animals enable row level security;
create policy "animals_public_read" on public.animals for select to anon, authenticated
  using (published or private.is_staff((select auth.uid())));
create policy "animals_staff_insert" on public.animals for insert to authenticated
  with check (private.is_staff((select auth.uid())));
create policy "animals_staff_update" on public.animals for update to authenticated
  using (private.is_staff((select auth.uid()))) with check (private.is_staff((select auth.uid())));
create policy "animals_staff_delete" on public.animals for delete to authenticated
  using (private.is_staff((select auth.uid())));
drop trigger if exists trg_touch on public.animals;
create trigger trg_touch before update on public.animals for each row execute function public.touch_updated_at();
drop trigger if exists trg_audit on public.animals;
create trigger trg_audit after insert or update or delete on public.animals for each row execute function public.write_audit();

-- ── Notifications: queued in the DB, delivered by the "notify" edge function ──
create extension if not exists pg_net;

create table if not exists private.app_config (key text primary key, value text not null);
insert into private.app_config (key, value)
values ('functions_url', 'https://cydcyotvlgqlveoegcpt.supabase.co/functions/v1')
on conflict (key) do update set value = excluded.value;

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('new_order', 'new_enquiry', 'order_confirmed', 'order_ready')),
  record_id uuid not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'skipped', 'failed')),
  detail text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists notifications_created_idx on public.notifications(created_at desc);
alter table public.notifications enable row level security;
create policy "notifications_admin_read" on public.notifications for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'));
revoke all on public.notifications from anon;

create or replace function private.queue_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_kind text; v_id bigint;
begin
  if tg_table_name = 'enquiries' then
    v_kind := 'new_enquiry';
  elsif new.is_test then
    return null;
  elsif tg_op = 'INSERT' then
    v_kind := 'new_order';
  elsif new.status = 'ready' and old.status <> 'ready' then
    v_kind := 'order_ready';
  elsif new.status = 'confirmed' and old.status = 'new' then
    v_kind := 'order_confirmed';
  else
    return null;
  end if;
  insert into public.notifications (kind, record_id) values (v_kind, new.id) returning id into v_id;
  -- pg_net sends after this transaction commits, so the order's items and totals are in place.
  perform net.http_post(
    url := (select value from private.app_config where key = 'functions_url') || '/notify',
    body := jsonb_build_object('id', v_id),
    headers := '{"Content-Type": "application/json"}'::jsonb);
  return null;
exception when others then
  return null; -- never block an order or enquiry because a notification couldn't be queued
end $$;
revoke execute on function private.queue_notification() from public, anon, authenticated;

drop trigger if exists trg_notify on public.orders;
create trigger trg_notify after insert or update of status on public.orders
  for each row execute function private.queue_notification();
drop trigger if exists trg_notify on public.enquiries;
create trigger trg_notify after insert on public.enquiries
  for each row execute function private.queue_notification();

-- ── Realtime: the admin updates live (RLS still applies to what each user receives) ──
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.enquiries; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.pending_approvals; exception when duplicate_object then null; end;
  end if;
end $$;
