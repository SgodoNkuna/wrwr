-- Removes TEST data before launch. Review before running.
delete from public.enquiries where email like '%@test.example';
update public.products set price_cents = null, show_price = false where slug <> 'broiler-chicks';
update public.products set image_url = null where image_url like '/images/test/%';
update public.products set in_stock = true where slug = 'ostriches';
update public.site_settings set value = value || '{"announcement":"Broiler chicks now available: box of 100 for R1 200."}' where key = 'home';
-- Test accounts (the last admin cannot be removed, so create the real admin first):
-- delete from auth.users where email in ('admin.test@example.com','editor.test@example.com','noaccess.test@example.com');
delete from public.orders where is_test;
update public.products set stock_qty = null;
-- delete from auth.users where email = 'customer.test@example.com';
delete from public.animals where tag like 'TEST-%';
delete from public.pending_approvals where requested_by_email like '%.test@example.com';
-- Test admins: remove from the SQL editor (it bypasses the two-person rule for owners):
-- delete from auth.users where email in ('admin2.test@example.com');
