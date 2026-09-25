-- Seed categories, products and settings from the client brief.
insert into public.categories (slug, name, description, sort_order) values
  ('poultry', 'Poultry & Birds', 'Day-old broiler chicks, Brahma chickens, turkeys, geese, ducks and ostriches.', 1),
  ('livestock', 'Livestock', 'Healthy cattle, goats and pigs raised on the farm in Letsitele.', 2),
  ('fresh-produce', 'Fresh Produce', 'Farm-fresh vegetables picked in season.', 3)
on conflict (slug) do nothing;

insert into public.products (category_id, slug, name, summary, description, unit, price_cents, show_price, featured, highlights, sort_order)
select c.id, v.slug, v.name, v.summary, v.description, v.unit, v.price_cents, v.show_price, v.featured, v.highlights, v.sort_order
from (values
  ('poultry','broiler-chicks','Broiler Chicks (Tau Poultry)','Healthy, fully vaccinated day-old broiler chicks.',
   'Our flagship product, sold under the Tau Poultry name. Day-old broiler chicks raised with care, fully vaccinated and ready for a better harvest. Sold per box of 100 chicks.',
   'Box of 100 chicks', 120000, true, true, array['Healthy & strong','Fully vaccinated','Cost effective'], 1),
  ('poultry','brahma-chickens','Brahma Chickens','Large, docile heritage Brahma chickens.',
   'Brahma chickens are known for their size, calm temperament and feathered feet, and suit backyard and breeding flocks alike.', 'Per bird', null, false, true, array['Heritage breed','Calm temperament'], 2),
  ('poultry','turkeys','Turkeys','Farm-raised turkeys.','Well-fed, farm-raised turkeys for breeding or the table.', 'Per bird', null, false, false, '{}'::text[], 3),
  ('poultry','geese','Geese','Hardy farm geese.','Hardy geese raised on open pasture.', 'Per bird', null, false, false, '{}'::text[], 4),
  ('poultry','ducks','Ducks','Healthy farm ducks.','Healthy ducks for eggs, meat or breeding.', 'Per bird', null, false, false, '{}'::text[], 5),
  ('poultry','ostriches','Ostriches','Ostriches raised on the farm.','Ostriches raised on the farm in Letsitele. Enquire for age and availability.', 'Per bird', null, false, false, '{}'::text[], 6),
  ('livestock','cattle','Cattle','Quality cattle from Gunyula Farm.','Well-cared-for cattle. Prices depend on the animal, so enquire and we will tell you what is available.', 'Per animal', null, false, true, array['Pasture raised'], 1),
  ('livestock','goats','Goats','Hardy goats suited to Limpopo conditions.','Hardy goats for breeding, meat and ceremonies.', 'Per animal', null, false, false, '{}'::text[], 2),
  ('livestock','pigs','Pigs','Healthy, well-fed pigs.','Healthy pigs raised on the farm. Ask about weaners and grown pigs.', 'Per animal', null, false, false, '{}'::text[], 3),
  ('fresh-produce','green-peppers','Green Peppers','Crisp, farm-fresh green peppers.','Freshly picked green peppers, available in bulk or smaller quantities.', 'Per crate / bag', null, false, false, array['Freshly picked'], 1),
  ('fresh-produce','green-beans','Green Beans','Tender, farm-fresh green beans.','Tender green beans picked fresh on the farm.', 'Per crate / bag', null, false, false, array['Freshly picked'], 2)
) as v(cat, slug, name, summary, description, unit, price_cents, show_price, featured, highlights, sort_order)
join public.categories c on c.slug = v.cat
on conflict (slug) do nothing;

insert into public.site_settings (key, value) values
  ('business', jsonb_build_object(
     'name','Tshehla AgriHub',
     'tagline','Nurture today''s harvest, nurture tomorrow''s growth.',
     'phone','068 828 9347',
     'alt_phone','083 798 6730',
     'whatsapp','27688289347',
     'email','',
     'address','Gunyula Farm 38, Letsitele, Limpopo, 0885',
     'hours','Mon to Sat, 07:00 to 17:00',
     'map_query','Letsitele, Limpopo'
  )),
  ('home', jsonb_build_object(
     'hero_title','Quality livestock & fresh produce from Letsitele',
     'hero_subtitle','Cattle, goats, pigs, poultry and farm-fresh vegetables, raised with care on Gunyula Farm.',
     'announcement','Broiler chicks now available: box of 100 for R1 200.'
  ))
on conflict (key) do nothing;

update public.products set image_url = '/images/tau-poultry-broilers.jpg'
where slug = 'broiler-chicks' and image_url is null;
