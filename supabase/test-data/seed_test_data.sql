-- TEST DATA ONLY. Dummy prices, placeholder images, sample enquiries and a test-site banner.
-- Safe to re-run. Undo with cleanup_test_data.sql before going live.

-- Dummy prices (Rand * 100). Some shown publicly, some kept as "Enquire for price" to test both.
update public.products p set price_cents = v.price, show_price = v.show,
  image_url = coalesce(nullif(p.image_url, ''), v.img)
from (values
  ('broiler-chicks',   120000, true,  null),
  ('brahma-chickens',   25000, true,  '/images/test/brahma-chickens.jpg'),
  ('turkeys',           45000, true,  '/images/test/turkeys.jpg'),
  ('geese',             35000, false, '/images/test/geese.jpg'),
  ('ducks',             15000, true,  '/images/test/ducks.jpg'),
  ('ostriches',        450000, false, '/images/test/ostriches.jpg'),
  ('cattle',          1200000, false, '/images/test/cattle.jpg'),
  ('goats',            180000, true,  '/images/test/goats.jpg'),
  ('pigs',             250000, false, '/images/test/pigs.jpg'),
  ('green-peppers',     18000, true,  '/images/test/green-peppers.jpg'),
  ('green-beans',       15000, true,  '/images/test/green-beans.jpg')
) as v(slug, price, show, img)
where p.slug = v.slug;

update public.products set in_stock = false where slug = 'ostriches';

-- Sample enquiries in every status (inserted as system, then statuses set).
delete from public.enquiries where email like '%@test.example';
insert into public.enquiries (product_id, name, phone, email, message, quantity, consent)
select p.id, v.name, v.phone, v.email, v.msg, v.qty, true
from (values
  ('broiler-chicks', 'Thabo Test',   '071 111 0001', 'thabo@test.example',   'TEST: Can I collect 3 boxes on Saturday?', '3 boxes'),
  ('cattle',         'Lerato Test',  '072 222 0002', 'lerato@test.example',  'TEST: Looking for 2 heifers, what do you have?', '2'),
  ('green-peppers',  'Sipho Test',   '073 333 0003', 'sipho@test.example',   'TEST: Weekly crate of peppers for my shop.', '1 crate/week'),
  ('goats',          'Naledi Test',  '074 444 0004', 'naledi@test.example',  'TEST: Goat for a ceremony next month.', '1'),
  (null,             'General Test', '075 555 0005', 'general@test.example', 'TEST: Do you deliver to Tzaneen?', null)
) as v(slug, name, phone, email, msg, qty)
left join public.products p on p.slug = v.slug;

update public.enquiries set status = 'contacted', admin_notes = 'TEST: Sent price list on WhatsApp.' where email = 'lerato@test.example';
update public.enquiries set status = 'closed',    admin_notes = 'TEST: Sold, collected.' where email = 'naledi@test.example';
update public.enquiries set created_at = now() - interval '3 days' where email in ('lerato@test.example', 'naledi@test.example');

-- Banner so nobody mistakes the test site for the real one.
update public.site_settings
set value = value || '{"announcement":"TEST SITE: prices and photos are dummy values for testing only."}'
where key = 'home';

-- Legal/business fields used by the Privacy, Terms and PAIA pages (placeholders to confirm with the client).
update public.site_settings
set value = value || '{"email":"info@tshehla-agrihub.co.za","legal_name":"Tshehla AgriHub","registration_number":"(to be confirmed)","information_officer":"(owner name to be confirmed)"}'
where key = 'business';
