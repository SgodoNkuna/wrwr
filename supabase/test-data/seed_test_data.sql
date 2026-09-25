-- TEST DATA ONLY. Dummy prices, placeholder images, sample enquiries and a test-site banner.
-- Do NOT re-run on the live project: since 2026-09-25 it holds the client's real prices, stock
-- and bank details, and this script would overwrite the prices and stock. Use it only on a fresh database.

-- Dummy prices (Rand * 100). Some shown publicly, some kept as "Enquire for price" to test both.
update public.products p set price_cents = v.price, show_price = v.show,
  image_url = coalesce(nullif(p.image_url, ''), v.img)
from (values
  ('broiler-chicks',   120000, true,  null),
  ('brahma-chickens',   25000, true,  null),
  ('turkeys',           45000, true,  null),
  ('geese',             35000, false, null),
  ('ducks',             15000, true,  null),
  ('ostriches',        450000, false, null),
  ('cattle',          1200000, false, null),
  ('goats',            180000, true,  null),
  ('pigs',             250000, false, null),
  ('green-peppers',     18000, true,  null),
  ('green-beans',       15000, true,  null)
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

-- Legal/business fields used by the Privacy, Terms and PAIA pages. The Information Officer is still to be confirmed.
update public.site_settings
set value = value || '{"email":"Tshehla.agrihub@gmail.com","legal_name":"Tshehla AgriHub (Pty) Ltd","registration_number":"2025/653280/07","information_officer":"(owner name to be confirmed)"}'
where key = 'business';

-- ── Online ordering test data (orders, stock) ────────────────────────────
-- Stock levels: chicks and Brahmas tracked, the rest not tracked.
update public.products set stock_qty = 40 where slug = 'broiler-chicks';
update public.products set stock_qty = 6  where slug = 'brahma-chickens';
update public.products set stock_qty = null where slug not in ('broiler-chicks', 'brahma-chickens');

-- 12 test orders spread over the last 14 days in every status. Marked is_test = true.
delete from public.orders where is_test;
with src(ref, days_ago, name, phone, method, pay, status, lines) as (values
  ('TA-TEST-00001', 0,  'Thabo Test',    '071 111 0001', 'eft',  'unpaid', 'new',       '[["broiler-chicks",2]]'),
  ('TA-TEST-00002', 0,  'Lerato Test',   '072 222 0002', 'cash', 'unpaid', 'new',       '[["green-peppers",3],["green-beans",2]]'),
  ('TA-TEST-00003', 1,  'Sipho Test',    '073 333 0003', 'eft',  'paid',   'confirmed', '[["broiler-chicks",5]]'),
  ('TA-TEST-00004', 2,  'Naledi Test',   '074 444 0004', 'cash', 'unpaid', 'ready',     '[["brahma-chickens",2],["ducks",4]]'),
  ('TA-TEST-00005', 3,  'Pieter Test',   '075 555 0005', 'eft',  'paid',   'completed', '[["broiler-chicks",3]]'),
  ('TA-TEST-00006', 4,  'Zanele Test',   '076 666 0006', 'eft',  'paid',   'completed', '[["turkeys",2]]'),
  ('TA-TEST-00007', 6,  'Musa Test',     '077 777 0007', 'cash', 'paid',   'completed', '[["broiler-chicks",1],["green-beans",5]]'),
  ('TA-TEST-00008', 7,  'Anna Test',     '078 888 0008', 'eft',  'unpaid', 'cancelled', '[["broiler-chicks",4]]'),
  ('TA-TEST-00009', 9,  'Tebogo Test',   '079 999 0009', 'eft',  'paid',   'completed', '[["broiler-chicks",6]]'),
  ('TA-TEST-00010', 10, 'Lindiwe Test',  '060 101 0010', 'cash', 'paid',   'completed', '[["green-peppers",10]]'),
  ('TA-TEST-00011', 12, 'Johan Test',    '061 121 0011', 'eft',  'paid',   'completed', '[["broiler-chicks",2],["ducks",2]]'),
  ('TA-TEST-00012', 13, 'Customer Test', '082 555 0123', 'eft',  'paid',   'completed', '[["broiler-chicks",1]]')
), ins as (
  insert into public.orders (reference, customer_name, phone, email, payment_method, payment_status, status,
    paid_at, consent_at, terms_accepted_at, is_test, created_at, updated_at)
  select ref, name, phone, lower(split_part(name, ' ', 1)) || '@test.example', method, pay, status,
    case when pay = 'paid' then now() - make_interval(days => days_ago) + interval '2 hours' end,
    now() - make_interval(days => days_ago), now() - make_interval(days => days_ago), true,
    now() - make_interval(days => days_ago), now() - make_interval(days => days_ago)
  from src returning id, reference
)
insert into public.order_items (order_id, product_id, product_name, unit, unit_price_cents, quantity, line_total_cents)
select ins.id, p.id, p.name, p.unit, p.price_cents, (l->>1)::int, p.price_cents * (l->>1)::int
from ins join src on src.ref = ins.reference
cross join lateral jsonb_array_elements(src.lines::jsonb) l
join public.products p on p.slug = l->>0;

update public.orders o set subtotal_cents = t.s, total_cents = t.s
from (select order_id, sum(line_total_cents) s from public.order_items group by order_id) t
where t.order_id = o.id and o.is_test;

-- Link the last one to the test customer account, if it exists.
update public.orders set customer_id = (select id from auth.users where email = 'customer.test@example.com')
where reference = 'TA-TEST-00012';

-- ── Livestock listings (individual animals / groups) ─────────────────────
delete from public.animals where tag like 'TEST-%';
insert into public.animals (product_id, tag, title, breed, sex, age_months, weight_kg, quantity, price_cents, show_price, status, image_url, notes, sort_order)
select p.id, v.tag, v.title, v.breed, v.sex, v.age, v.kg, v.qty, v.price, v.show, v.status, v.img, v.notes, v.ord
from (values
  ('cattle', 'TEST-C014', 'Bonsmara heifer',  'Bonsmara',  'female', 18, 320.0, 1, 1250000, true,  'available', null, 'TEST listing. Calm, dewormed.', 1),
  ('cattle', 'TEST-C021', 'Nguni bull',       'Nguni',     'male',   30, 480.0, 1, null,    false, 'available', null, 'TEST listing. Ask for price.', 2),
  ('cattle', 'TEST-C009', 'Brahman cow',      'Brahman',   'female', 48, 510.0, 1, 1450000, true,  'reserved',  null, 'TEST listing.', 3),
  ('goats',  'TEST-G003', 'Boer goat ewes',   'Boer',      'female', 10,  38.0, 4,  180000, true,  'available', null,  'TEST listing. Price per goat.', 1),
  ('goats',  'TEST-G007', 'Boer buck',        'Boer',      'male',   24,  75.0, 1,  350000, true,  'sold',      null,  'TEST listing.', 2),
  ('pigs',   'TEST-P101', 'Large White weaners', 'Large White', 'mixed', 2, 12.0, 10, 90000, true, 'available', null,   'TEST listing. Price per weaner.', 1)
) as v(slug, tag, title, breed, sex, age, kg, qty, price, show, status, img, notes, ord)
join public.products p on p.slug = v.slug;
-- A second test admin (admin2.test@example.com) exists so two-person approval can be tested.
