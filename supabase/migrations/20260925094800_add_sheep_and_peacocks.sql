-- Sheep and peacocks, confirmed by the client on 2026-09-25. Enquire for price until the client sets one.
insert into public.products (category_id, slug, name, summary, description, unit, price_cents, show_price, featured, highlights, sort_order)
select c.id, v.slug, v.name, v.summary, v.description, v.unit, null, false, false, '{}'::text[], v.sort_order
from (values
  ('livestock','sheep','Sheep','Hardy sheep raised on Gunyula Farm.',
   'Sheep raised on the farm in Letsitele. Enquire for breed, age and price.', 'Per animal', 4),
  ('poultry','peacocks','Peacocks','Peacocks and peahens raised on the farm.',
   'Peafowl raised on the farm in Letsitele. Enquire for age and price.', 'Per bird', 7)
) as v(category, slug, name, summary, description, unit, sort_order)
join public.categories c on c.slug = v.category
on conflict (slug) do nothing;

update public.categories set description = 'Day-old broiler chicks, Brahma chickens, turkeys, geese, ducks, ostriches and peacocks.'
where slug = 'poultry';
update public.categories set description = 'Healthy cattle, goats, sheep and pigs raised on the farm in Letsitele.'
where slug = 'livestock';
