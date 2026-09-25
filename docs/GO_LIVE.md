# Go-live checklist

Everything in the code is built and tested. What's left needs **your accounts, keys or decisions**,
which I couldn't create or change from the build environment. Each step says where to do it.

## 1. Supabase dashboard (project `supabase-citron-ocean`)
- [ ] **Authentication → URL Configuration.** Set **Site URL** to the live domain (for now `https://tshehla-agrihub.vercel.app`) and add these **Redirect URLs**:
      `https://tshehla-agrihub.vercel.app/account`, `https://tshehla-agrihub.vercel.app/account/reset`, `https://tshehla-agrihub.vercel.app/admin/reset`.
      *Until this is done, sign-up confirmation and password-reset emails point at `localhost` and won't work.*
- [ ] **Authentication → Providers → Email.** Keep "Confirm email" on.
- [ ] **Authentication → Passwords.** Turn on **Leaked password protection**.
- [ ] **Authentication → SMTP.** Add a real email sender (for example Resend SMTP). The built-in sender only allows a few emails per hour.
- [ ] **Authentication → Multi-Factor.** Confirm **TOTP** is enabled. It's on by default.

## 2. Alerts (new orders, enquiries, customer confirmations)
Supabase → Edge Functions → **Secrets**:
- [ ] `RESEND_API_KEY` from resend.com. Verify the business domain there first.
- [ ] `EMAIL_FROM`, for example `Tshehla AgriHub <orders@tshehla-agrihub.co.za>`.
- [ ] `ALERT_EMAIL_TO`: the inbox that should get new-order alerts.
- [ ] `SITE_URL`: the live URL.
- [ ] Optional, WhatsApp alerts to the owner: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ALERT_TO`, `WHATSAPP_ALERT_TEMPLATE`. These need a Meta WhatsApp Business (Cloud API) account and an approved template with one `{{1}}` body variable.

Check it works: place a test order, then look at **Admin → Payments → Payment log**. For notifications, run `select * from notifications order by id desc` in the SQL editor.

## 3. Online payments (when the client confirms)
- [ ] PayFast merchant account in the business's name.
- [ ] Edge Function secrets: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_SANDBOX=true`.
- [ ] Place a sandbox test payment end to end, then set `PAYFAST_SANDBOX=false`.
- [ ] **Admin → Payments:** switch on "Offer Pay online".

## 4. Bot protection at checkout (free)
- [ ] At dash.cloudflare.com → Turnstile, create a widget for the live domain.
- [ ] **Admin → Payments → "I'm human" check:** paste the site key and secret key. The secret is stored in Supabase Vault.

## 5. Security for staff
- [ ] Each admin: **Admin → My security → Set up two-step sign-in**.
- [ ] Then switch on **"Require two-step sign-in for every staff member"**.
- [ ] Keep **two-person approval** on. With one real admin, that admin can only approve their own high-risk requests after signing in with a code.

## 6. Content and data
- [ ] **Admin → Site settings:** real registered name, CIPC number, POPIA Information Officer, email.
- [ ] **Admin → Payments:** real bank details, and hold times if 48 or 72 hours doesn't suit.
- [ ] Real photos for products and livestock listings (uploads are resized, and location data is removed automatically).
- [ ] Real stock levels.
- [ ] Run `supabase/test-data/cleanup_test_data.sql`, then delete the test accounts in Supabase → Authentication → Users:
      `admin.test`, `admin2.test`, `editor.test`, `noaccess.test`, `customer.test` (all `@example.com`).
- [ ] Have an attorney review the Privacy Policy, Terms, and Orders & Returns policy.

## 7. Domain and hosting
- [ ] Buy the domain, for example `tshehla-agrihub.co.za` through a `.co.za` registrar.
- [ ] **Option A, Vercel:** add the domain to the `tshehla-agrihub` project. Consider transferring the project out of the "African Women Investment Network" team into the client's own team (Project → Settings → Transfer).
- [ ] **Option B, self-host with Docker:** on any Linux server with Docker, `cp .env.example .env`, fill it in, point DNS at the server, then run `docker compose up -d --build`. Caddy gets the HTTPS certificate automatically.
- [ ] Update `public/sitemap.xml` and `public/robots.txt` if the final domain isn't `tshehla-agrihub.co.za`.
- [ ] Set up the business email address on the domain (the brief promised one). Use your registrar's or Google Workspace / Zoho mail.
