# Testing guide: Tshehla AgriHub

Everything on the test site is **dummy data**. The orange banner at the top says so.
When you're finished testing, run `supabase/test-data/cleanup_test_data.sql` (see "Before launch" below).

## Test accounts
Passwords are shared privately and are **not stored in this repo**, because the repo is public.

| Account | Email | What it can do |
|---|---|---|
| Admin | `admin.test@example.com` | Everything: products, enquiries, settings, users & roles, audit log, deletes |
| Editor | `editor.test@example.com` | Products, categories, services, enquiries. No settings, users, deletes or audit log |
| No access | `noaccess.test@example.com` | Can sign in, but sees "Awaiting access" and nothing else |

Log in at **`/admin`**.

## Dummy data loaded
- **Prices** on all 11 products. Seven are shown publicly: broiler chicks R1 200, Brahma R250, turkeys R450, ducks R150, goats R1 800, green peppers R180, green beans R150. Four are hidden and show "Enquire for price": geese, ostriches, cattle, pigs.
- **Pictures:** every product has a "TEST IMAGE" placeholder. Broiler chicks use the real Tau Poultry flyer.
- **Ostriches** are marked **sold out**.
- **Enquiries:** 5 samples (3 new, 1 contacted, 1 closed).
- **Spare images** for testing uploads are in [`docs/test-assets/`](test-assets/). Download them to your phone or PC first.

## Test script
### Public site (no login)
1. **Home:** the TEST banner, the cookie banner, the flagship chicks with R1,200, and the "What we farm" categories all show.
2. **Cookie banner:** click **Essential only**. On **Contact**, the map should stay hidden until you click **Load map**. Footer → **Cookie settings** reopens the banner.
3. **Products:** filter by each category and search for "goat". Ostriches show **Sold out**. Cattle shows **Enquire for price**.
4. **Enquire on WhatsApp** on any product opens WhatsApp to 068 828 9347 with the product name filled in.
5. **Enquiry form:** try to send without ticking the consent box (it's blocked). Tick it and send (you see "Thank you!"). Send 3 more from the same phone number within an hour: the 4th is refused (spam guard).
6. **Legal pages:** the footer links to Privacy, Terms, Cookies and PAIA, and each page opens.

### Editor (`editor.test@example.com`)
1. **Products → Edit Goats:** change the price, untick "Show price publicly", upload `docs/test-assets/upload-test-cattle-herd.jpg`, and save. Check the public site updates.
2. **Hide a product** (eye icon). It disappears from the public site. Show it again.
3. **Enquiries:** open **New**, add a note, and click **Reply** (WhatsApp opens and the status changes to *contacted*).
4. The sidebar should **not** show Site settings, Users & roles or Audit log, and there should be no delete buttons.

### Admin (`admin.test@example.com`)
1. **Site settings:** change the opening hours and the announcement text, save, and check the public site.
2. **Users & roles:** give `noaccess.test@example.com` the editor role. Log in as that user, who now sees the admin. Remove the role again.
3. Try to untick **your own admin** box while you are the only admin. It's refused: "can't remove the last admin".
4. **Audit log:** every change you just made is listed with your email.
5. **Delete** a test enquiry.
6. **Categories / Services:** add a service, publish it, and check it appears on **About**.

## Before launch
1. In **Admin → Site settings**, fill in the real registered name, CIPC number, POPIA Information Officer and email. The legal pages use these values.
2. Create the real owner account, make it admin, then run `cleanup_test_data.sql` and delete the test accounts.
3. In the Supabase dashboard: set the Auth Site URL to the live domain, turn on "Leaked password protection", and keep "Confirm email" on.
4. Replace the placeholder photos with real farm photos.
5. Have the Privacy Policy and Terms reviewed by an attorney before launch. They're a solid POPIA-aligned starting point, not legal advice.
