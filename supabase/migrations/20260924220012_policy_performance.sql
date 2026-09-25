-- Performance (advisors 0001/0003/0006): wrap auth.uid() in a subselect so it's evaluated once
-- per query, split "for all" staff policies so SELECT has a single policy, index enquiries FK.

create index if not exists enquiries_product_idx on public.enquiries(product_id);

drop policy if exists "profiles_self_read" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_staff((select auth.uid())));
create policy "profiles_self_update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "roles_read" on public.user_roles;
drop policy if exists "roles_admin_insert" on public.user_roles;
drop policy if exists "roles_admin_delete" on public.user_roles;
create policy "roles_read" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.has_role((select auth.uid()), 'admin'));
create policy "roles_admin_insert" on public.user_roles for insert to authenticated
  with check (private.has_role((select auth.uid()), 'admin'));
create policy "roles_admin_delete" on public.user_roles for delete to authenticated
  using (private.has_role((select auth.uid()), 'admin'));

-- Catalogue tables share the same shape.
do $$ declare t text; begin
  foreach t in array array['categories','products','services'] loop
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_write', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (published or private.is_staff((select auth.uid())))', t || '_public_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_staff((select auth.uid())))', t || '_staff_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_staff((select auth.uid()))) with check (private.is_staff((select auth.uid())))', t || '_staff_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_staff((select auth.uid())))', t || '_staff_delete', t);
  end loop;
end $$;

drop policy if exists "settings_admin_write" on public.site_settings;
create policy "settings_admin_insert" on public.site_settings for insert to authenticated
  with check (private.has_role((select auth.uid()), 'admin'));
create policy "settings_admin_update" on public.site_settings for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "settings_admin_delete" on public.site_settings for delete to authenticated
  using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "enquiries_staff_read" on public.enquiries;
drop policy if exists "enquiries_staff_update" on public.enquiries;
drop policy if exists "enquiries_admin_delete" on public.enquiries;
create policy "enquiries_staff_read" on public.enquiries for select to authenticated
  using (private.is_staff((select auth.uid())));
create policy "enquiries_staff_update" on public.enquiries for update to authenticated
  using (private.is_staff((select auth.uid()))) with check (private.is_staff((select auth.uid())));
create policy "enquiries_admin_delete" on public.enquiries for delete to authenticated
  using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "audit_admin_read" on public.audit_logs;
create policy "audit_admin_read" on public.audit_logs for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "product_images_staff_insert" on storage.objects;
drop policy if exists "product_images_staff_update" on storage.objects;
drop policy if exists "product_images_staff_delete" on storage.objects;
create policy "product_images_staff_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and private.is_staff((select auth.uid())));
create policy "product_images_staff_update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and private.is_staff((select auth.uid())));
create policy "product_images_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and private.is_staff((select auth.uid())));
