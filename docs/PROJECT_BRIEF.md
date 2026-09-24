# Project Brief: Tshehla AgriHub Website

## Client
- **Business:** Tshehla AgriHub (the same family operation that runs *Tau Poultry*)
- **Address:** Gunyula Farm 38, Letsitele, Limpopo, 0885 (near Tzaneen 0850)
- **Phone / WhatsApp Business:** 068 828 9347 (+27 68 828 9347)
- **Alt. phone (from the Tau Poultry flyer):** 083 798 6730

## Goal
A public website for the farm that lists all of its livestock and fresh produce so anyone
can look through it and get in touch. Every product has an "Enquire for price" call to action
that opens WhatsApp with a pre-filled message, or sends an enquiry form that the farm sees in
an admin dashboard. Prices are hidden by default because they change per animal. The
owner can switch a price on for any product (for example, broiler chicks at R1 200 for a box of 100).

## Products (at launch)
| Category | Products |
|---|---|
| Livestock | Cattle, Goats, Pigs |
| Poultry & Birds | Broiler chicks (flagship, sold as Tau Poultry: box of 100, R1 200, vaccinated), Brahma chickens, Turkeys, Geese, Ducks, Ostriches |
| Fresh Produce | Green peppers, Green beans |

Services: there are none at launch, but the data model and admin already support adding them later.

## Scope
1. **Public site:** Home (hero, flagship product, categories, trust badges), Products (filter by
   category), Product detail, About, Contact (map, form, WhatsApp). Mobile first, fast and SEO-ready.
2. **WhatsApp integration:** A floating WhatsApp button and a WhatsApp enquiry link on every product (`wa.me` deep link with a
   pre-filled message naming the product).
3. **Backend (Supabase):** Postgres with Row Level Security on every table, plus Storage for product
   images and Auth for admins.
4. **Admin dashboard** (same control level as the A-Win build):
   - Products and categories: create, edit, hide, reorder, set featured, upload images, toggle price visibility
   - Services (ready for later use)
   - Enquiries inbox: status workflow (new, contacted, closed), reply on WhatsApp in one click
   - Site settings: phone numbers, WhatsApp, address, hours, hero text
   - Users and roles (`admin` / `editor`); only admins manage roles
   - Audit log of every admin change
5. **Security** (same level as A-Win):
   - RLS on every table, with a single `has_role()` helper
   - The public can only read published rows and insert enquiries (validated and rate-limited in the database)
   - Admin rights are checked server-side by RLS, never only in the UI
   - No service-role key ships to the browser. Security headers and a CSP are set on the host.
   - Last-admin protection: the final admin cannot be demoted

## Commercials (agreed in chat)
- Quote: **R7 500** once-off, including domain, WhatsApp integration, and a domain email address
- **No monthly hosting fee.** The only recurring cost is the yearly domain renewal.
- Payment: 50% deposit up front, and the remaining 50% one week before launch

## Out of scope for v1
Online payments or checkout, and customer accounts.
