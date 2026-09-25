# Go-live checklist

Everything in the code is built and tested. What's left needs **your accounts, keys or decisions**,
which I couldn't create or change from the build environment. Each step says where to do it.

## 1. Supabase dashboard (project `supabase-citron-ocean`)
- [ ] **Authentication → URL Configuration** ([direct link](https://supabase.com/dashboard/project/cydcyotvlgqlveoegcpt/auth/url-configuration)). Set **Site URL** to `https://www.tshehlaagrihub.co.za` and add these **Redirect URLs**:
      `https://www.tshehlaagrihub.co.za/**` and `https://tshehla-agrihub.vercel.app/**`.
      *Until this is done, sign-up confirmation and password-reset emails point at `localhost` and won't work.*
- [ ] **Authentication → Providers → Email.** Keep "Confirm email" on.
- [ ] **Authentication → Passwords.** Turn on **Leaked password protection**.
- [ ] **Authentication → SMTP.** Add a real email sender (for example Resend SMTP). The built-in sender only allows a few emails per hour.
- [ ] **Authentication → Multi-Factor.** Confirm **TOTP** is enabled. It's on by default.

## 2. Alerts (new orders, enquiries, customer confirmations)
Supabase → Edge Functions → **Secrets**:
- [ ] `RESEND_API_KEY` from resend.com. Verify the business domain there first.
- [ ] `EMAIL_FROM`, for example `Tshehla AgriHub <orders@tshehlaagrihub.co.za>`.
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
- [x] Registered name **Tshehla AgriHub (Pty) Ltd** and CIPC number **2025/653280/07** are set (they show in the footer and legal pages).
- [x] Business email: `Tshehla.agrihub@gmail.com`.
- [ ] **Admin → Site settings:** the POPIA Information Officer (usually the owner).
- [x] **Admin → Payments:** Capitec Business bank details are set. **Confirm the branch code `450105`** (Capitec Business's universal code) in the banking app. Change the hold times if 48 or 72 hours doesn't suit.
- [x] Real farm photos on every product (resized to WebP, no location data). Broiler chicks use the Tau Poultry flyer.
- [x] Prices entered by the client. Stock is set to 50 of each product for now; update it in **Products & stock**.
- [x] Test data removed on 25 Sep 2026: test orders, enquiries, livestock listings, the TEST banner and the `editor.test`, `noaccess.test` and `customer.test` accounts.
- [ ] **Owner login:** once the Supabase Site URL is set (section 1), the owner signs up at `/admin` → **Request staff account**. `admin.test` gives them admin, `admin2.test` approves it, and then both test admins are deleted in Supabase → Authentication → Users. They're kept until then, because otherwise nobody could sign in to the admin.
- [ ] Have an attorney review the Privacy Policy, Terms, and Orders & Returns policy.

## 7. Domain and hosting
- [x] Daily keep-alive: a Vercel cron calls `/api/keepalive` at 04:17 UTC, so the free-plan Supabase project doesn't pause from inactivity. It is optional, but if you set `CRON_SECRET` in Vercel, the endpoint only answers Vercel's own cron calls.
- [x] Domain bought: **`tshehlaagrihub.co.za`** (GoDaddy, renews 25 Sep 2027).
- [x] **Connected (25 Sep 2026).** GoDaddy DNS: `A @ → 76.76.21.21` and `CNAME www → cname.vercel-dns.com`. In Vercel, **`www.tshehlaagrihub.co.za` is the main address** and `tshehlaagrihub.co.za` redirects to it (308). HTTPS is issued by Vercel.
- [ ] Set the Supabase **Site URL** and **Redirect URLs** (section 1) and the `SITE_URL` secret (sections 2 and 3) to `https://www.tshehlaagrihub.co.za`.
- [ ] Merge the PR (or redeploy production) so the live `sitemap.xml` and `robots.txt` use the new address.
- [ ] Consider transferring the Vercel project out of the "African Women Investment Network" team into the client's own team (Project → Settings → Transfer).
- [ ] **Option B, self-host with Docker:** on any Linux server with Docker, `cp .env.example .env`, fill it in, point DNS at the server, then run `docker compose up -d --build`. Caddy gets the HTTPS certificate automatically.
- [x] `public/sitemap.xml` and `public/robots.txt` point at `tshehlaagrihub.co.za`.
- [ ] Set up the business email address on the domain (the brief promised one). Use your registrar's or Google Workspace / Zoho mail.
