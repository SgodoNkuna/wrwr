# Prompt v2: Test-ready build, compliance, and deployment

**Project:** Tshehla AgriHub website (repo `SgodoNkuna/wrwr`, Supabase project `supabase-citron-ocean`).
**Reference builds:** A-Win (`SgodoNkuna/awin-prototype`) for admin control and security, and BFM Sportz (`SgodoNkuna/bfmsportz`) for overall build quality.

## 1. Deploy to Vercel
- Create a Vercel project linked to the GitHub repo, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and deploy a preview I can open on my phone.
- Point Supabase Auth's Site URL and redirect URLs at the deployed domain so login and password reset work.

## 2. Get Supabase fully set up
- Apply all migrations, confirm the security advisor is clean, and confirm the storage bucket exists.

## 3. Test data (clearly marked as TEST)
- **Pictures:** a dummy image for every product, shown on the site, plus a folder of spare test images I can upload myself through the admin.
- **Prices:** dummy prices on every product, with some shown publicly and some left as "Enquire for price", so I can test both.
- **Enquiries:** a few sample enquiries in different statuses so the inbox isn't empty.
- **Accounts** (email confirmed, ready to log in):
  - Admin: full control
  - Editor: products and enquiries only
  - No-access: signed in but has no role, to test that the lock-out works
- Give me a short test script: what to click, and what should happen.

## 4. Legal and compliance for South Africa
Everything a small SA business website needs so we aren't exposed:
- **POPIA:** a privacy policy covering who we are, the Information Officer, what we collect and why, how long we keep it, who we share it with, the user's rights, and how to complain to the Information Regulator.
- **Consent:** a required tick-box on the enquiry form, with the consent time stored in the database.
- **Cookie banner:** accept or reject. Non-essential third-party content (the Google Maps embed) loads only after consent.
- **Terms of use:** pricing and availability, livestock sales and health, no guarantee, limitation of liability, governed by South African law.
- **ECT Act s43:** business details shown on the site.
- **PAIA:** a short access-to-information notice.
- **Data retention:** old enquiries are purged automatically.
- **SEO:** a meta title and description per page, a sitemap, robots.txt, and LocalBusiness structured data.

## 5. Completeness
- No empty pages or dead links. Every admin function works against the real database.

## 6. Run it
Build it, test it end to end, deploy it, and give me the URLs and login details.
