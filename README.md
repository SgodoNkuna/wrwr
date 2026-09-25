# Tshehla AgriHub website

Public catalogue and admin dashboard for **Tshehla AgriHub** (Gunyula Farm 38, Letsitele, Limpopo), home of *Tau Poultry* broiler chicks.
See [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) for the client brief.

**Stack:** Vite + React + TypeScript + Tailwind on the front end. Supabase (Postgres, Auth, Storage) is the backend, and the site deploys as a static build (Vercel config included).

## Features
- **Online ordering:** basket, checkout (EFT / pay on collection / online *coming soon*), an order confirmation page with payment instructions, and order tracking by reference plus cellphone.
- **Customer accounts** (`/account`): order history, messages, profile, and POPIA self-service (download my data, request deletion or correction).
- **Livestock listings:** individual animals (or groups) with tag, breed, age, weight, photo and status, shown as "Available now" on the product page.
- **Alerts:** new orders, enquiries and approval requests pop up live in the admin (sound and desktop notifications). Email and WhatsApp alerts, plus customer order emails, are sent by the `notify` edge function once keys are set.
- **Payments placeholder:** PayFast checkout and a verified webhook, as Supabase Edge Functions (`supabase/functions/`). They stay switched off until merchant keys are added; see `docs/TESTING_GUIDE.md`.
- **Public site:** Home, Products (category filter and search), Product detail, About, Contact (map and enquiry form), plus a floating WhatsApp button.
- **"Enquire for price":** Every product opens WhatsApp with a message that names the product. Prices stay hidden unless the admin turns them on for that product.
- **Admin (`/admin`):**
  - **Sales:** a dashboard (KPIs, 14-day orders chart, needs-attention list), Orders (status workflow, mark paid, cancel with automatic restock, pre-written WhatsApp messages), Enquiries, and Customers.
  - **Catalogue:** Products & stock (online-orderable flag, stock levels, per-order limit), Categories, and Services.
  - **Settings:** Approvals, Payments, Site settings, Users & roles, Privacy requests, Audit log (searchable, CSV export), and My security (two-step sign-in).
  - Orders support delivery charges and a CSV export for the accountant.

## Security model
| Layer | What it does |
|---|---|
| RLS on every table | The public reads only published catalogue rows and settings, and can **insert** enquiries but never read them back. |
| Roles | `admin` / `editor` in `user_roles`, checked by `private.has_role()` / `private.is_staff()`, which are not exposed over the API. |
| Editor | Manages products, categories, services, enquiries, and image uploads. |
| Admin | Everything an editor can do, plus settings, user roles, deletes, and the audit log. |
| Self-promotion | Blocked, because only admins can insert into `user_roles`. |
| Last-admin guard | A database trigger refuses to remove the final admin. |
| Audit log | A trigger records every staff insert, update, and delete with a before/after snapshot. The log is read-only and there are no write policies on it. |
| Orders | Created only through `place_order()`. The browser sends product ids and quantities; the server looks up prices, checks stock (with a row lock), and computes totals. Customers can read only their own orders and can't mark anything paid. |
| Order tracking | `track_order()` needs the random reference **and** the cellphone number used. |
| Public functions | `place_order` and `track_order` are intentionally callable without login, so the Supabase advisor lists them. Both validate all input server-side and are rate-limited. |
| Payments | Only staff, or the PayFast webhook after signature, merchant, amount and PayFast post-back checks, can mark an order paid. Merchant keys live only in Edge Function secrets. |
| Profiles | Customers can edit only their name and phone. Email and id are column-locked. |
| Staff two-step sign-in | TOTP via Supabase MFA. Once enrolled, a staff member's permissions only count at AAL2 (code entered). An admin switch makes it compulsory for all staff. |
| Two-person approval | Granting or removing admin, deleting or refunding an order, anonymising a customer, and switching the rule off all need a **different** admin to approve (`request_approval` / `decide_approval`). Database triggers block the direct route. A sole admin can self-approve only at AAL2. |
| Stock holds | Unpaid EFT/online orders are auto-cancelled after 48h (pay-on-collection: 72h if not confirmed) and their stock is released (`pg_cron`, every 15 min). |
| Bot check | Cloudflare Turnstile at checkout, verified **in the database** against Cloudflare. It's enforced once keys are saved in Admin → Payments; the secret lives in Supabase Vault. |
| Totals | `total = subtotal + delivery`, always set by a trigger. Line totals can't be edited from the website, and delivery locks once an order is paid. |
| Enquiry spam guard | DB checks on phone, email, and lengths. Limits are 3 per phone per hour and 20 per minute site-wide. Public submissions are always forced to `status = new`. There's also a honeypot field. |
| Storage | The `product-images` bucket accepts JPG, PNG, and WebP only, up to 5 MB. Only staff can write. |
| Headers | HSTS, CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, and Permissions-Policy are set in `vercel.json`. |
| Keys | Only the publishable key is used in the browser. The service-role key is never used. |

The Supabase security advisor reports **0 issues**.

## Compliance (South Africa)
- **POPIA:** `/privacy` policy, a required consent tick-box on enquiries (the consent timestamp is set by the server), and automatic deletion of enquiries after 24 months (`pg_cron`).
- **Cookies:** consent banner. Google Maps loads only after consent. There are no analytics or marketing cookies. See `/cookies`.
- **Terms of Use** with ECT Act s43 business details (`/terms`), and a **PAIA** notice (`/paia`).
- **SEO:** per-page titles and descriptions, canonical URLs, Open Graph tags, LocalBusiness and Product JSON-LD, `sitemap.xml` and `robots.txt`.

## Design
See [`docs/DESIGN_NOTES.md`](docs/DESIGN_NOTES.md) for how the design avoids the usual "AI template" look.

## Testing
See [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md) for the test accounts, dummy data and a click-through script. - `npm test`: unit tests.
- `npm run test:e2e`: end-to-end checks plus an axe accessibility scan (WCAG 2 AA; fails on serious or critical issues) against a running `vite preview`.
- CI runs the unit tests and build, the e2e and accessibility suite, and a Docker build-and-serve check on every PR.
- Going live: [`docs/GO_LIVE.md`](docs/GO_LIVE.md).

## Hosting
- **Vercel** (current): `vercel.json` has the SPA routing, security headers and CSP, and sends chat-app link-preview bots to `api/share.js`, so WhatsApp shows the right product, price and photo.
- **Docker** (self-host): `Dockerfile` + `docker-compose.yml` (Caddy with automatic HTTPS). `server/index.mjs` serves the build with the same headers (read from `vercel.json`), link previews, gzip and `/healthz`.
  ```bash
  cp .env.example .env   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, DOMAIN
  docker compose up -d --build
  ```

## Run locally
```bash
cp .env.example .env    # fill in the Supabase URL + publishable key
npm install
npm run dev             # http://localhost:5173
npm run build && npm run preview
```

## Database
Migrations are in `supabase/migrations/` and are already applied to the Supabase project **`supabase-citron-ocean`** (`cydcyotvlgqlveoegcpt`).

### Create the first admin (one-time)
1. Go to `/admin`, click **Request staff account**, and sign up.
2. In the Supabase SQL editor, run:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'owner@example.com';
   ```
3. From then on, grant or revoke roles from **Admin → Users & roles**.

**Recommended Supabase dashboard settings:** under Auth → Providers → Email, enable "Confirm email". Set the Site URL to the production domain and add `https://<domain>/admin/reset` to the redirect URLs.

## Deploy (Vercel)
Import the repo, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and deploy. `vercel.json` already handles SPA routing and security headers.
