# Testing guide: Tshehla AgriHub

Everything on the test site is **dummy data**. The orange banner at the top says so.
When you're finished testing, run `supabase/test-data/cleanup_test_data.sql` (see "Before launch" below).

## Test accounts
Passwords are shared privately and are **not stored in this repo**, because the repo is public.

| Account | Email | What it can do |
|---|---|---|
| Admin | `admin.test@example.com` | Everything: products, enquiries, settings, users & roles, audit log, deletes |
| Editor | `editor.test@example.com` | Products, categories, services, enquiries. No settings, users, deletes or audit log |
| No access | `noaccess.test@example.com` | Can sign in to the admin, but sees "Awaiting access" and nothing else |
| Customer | `customer.test@example.com` | A shopper account at **`/account`**. It has one past order (TA-TEST-00012). |

Staff log in at **`/admin`**. Customers log in at **`/account`** (the "Sign in" link in the header).

## Dummy data loaded
- **Prices** on all 11 products. Seven are shown publicly: broiler chicks R1 200, Brahma R250, turkeys R450, ducks R150, goats R1 800, green peppers R180, green beans R150. Four are hidden and show "Enquire for price": geese, ostriches, cattle, pigs.
- **Pictures:** every product has a "TEST IMAGE" placeholder. Broiler chicks use the real Tau Poultry flyer.
- **Ostriches** are marked **sold out**.
- **Enquiries:** 5 samples (3 new, 1 contacted, 1 closed).
- **Orders:** 12 test orders over the last 14 days, in every status (references `TA-TEST-00001` to `TA-TEST-00012`, all flagged TEST).
- **Stock:** broiler chicks 40 boxes, Brahma chickens 6 (shows as low stock). Other products aren't stock-tracked.
- **Online ordering** is on for broiler chicks, Brahmas, turkeys, ducks, green peppers and green beans. Livestock stays enquiry-only.
- **Payments:** EFT and pay-on-collection are on. Online payment (PayFast) shows **"Coming soon"** until merchant keys are added. Bank details are empty, so customers are told they'll get them on WhatsApp.
- **Spare images** for testing uploads are in [`docs/test-assets/`](test-assets/). Download them to your phone or PC first.

## Test script
### Public site (no login)
1. **Home:** the TEST banner, the cookie banner, the flagship chicks with R1,200, and the "What we farm" categories all show.
2. **Cookie banner:** click **Essential only**. On **Contact**, the map should stay hidden until you click **Load map**. Footer → **Cookie settings** reopens the banner.
3. **Products:** filter by each category and search for "goat". Ostriches show **Sold out**. Cattle shows **Enquire for price**.
4. **Enquire on WhatsApp** on any product opens WhatsApp to 068 828 9347 with the product name filled in.
5. **Enquiry form:** try to send without ticking the consent box (it's blocked). Tick it and send (you see "Thank you!"). Send 3 more from the same phone number within an hour: the 4th is refused (spam guard).
6. **Legal pages:** the footer links to Privacy, Terms, Cookies and PAIA, and each page opens.

### Ordering (no login)
1. Open **Broiler Chicks**, pick 3, and click **Add to basket**. The basket counter shows 3.
2. **Basket → Checkout.** "Pay online now" is greyed out with a **Coming soon** badge.
3. Choose **EFT**. Try to place the order without ticking the two boxes (it's blocked). Tick them and place it.
4. The confirmation page shows your **TA-… order number**, the items, and EFT instructions. Keep the number.
5. **Track order** (header): enter the number and the same cellphone to see the order. A different cellphone is refused.
6. Try ordering 41 boxes of chicks: it's refused ("Only 40 left"). Livestock pages have no basket button, only WhatsApp.

### Customer account (`customer.test@example.com`)
1. **Sign in** from the header. **Orders** shows TA-TEST-00012.
2. **My details:** change the cellphone number and save.
3. **Privacy:** click **Download my data** (a file downloads), then send a "Delete my account" request. It appears under Admin → Privacy requests.
4. Place an order while signed in: your name and number are filled in, and the order appears in **Orders**.

### Editor (`editor.test@example.com`)
1. **Products → Edit Goats:** change the price, untick "Show price publicly", upload `docs/test-assets/upload-test-cattle-herd.jpg`, and save. Check the public site updates.
2. **Hide a product** (eye icon). It disappears from the public site. Show it again.
3. **Enquiries:** open **New**, add a note, and click **Reply** (WhatsApp opens and the status changes to *contacted*).
4. **Orders:** open a new order, then **Mark confirmed → Mark ready → Mark completed**. Use the WhatsApp shortcuts (they open WhatsApp with the message written). **Mark paid** an EFT order with a reference.
5. **Cancel** an order that has chicks: the chick stock goes back up under Products & stock.
6. **Products & stock:** use the − / + buttons to change the chick stock. Set it to 0: the site shows **Sold out**.
7. **Customers:** everyone who has ordered, grouped by account or cellphone.
8. The sidebar should **not** show Payments, Site settings, Users & roles or Audit log, and there should be no delete buttons.

### Admin (`admin.test@example.com`)
1. **Site settings:** change the opening hours and the announcement text, save, and check the public site.
2. **Users & roles:** give `noaccess.test@example.com` the editor role. Log in as that user, who now sees the admin. Remove the role again.
3. Try to untick **your own admin** box while you are the only admin. It's refused: "can't remove the last admin".
4. **Audit log:** every change you just made is listed with your email.
5. **Delete** a test enquiry.
6. **Categories / Services:** add a service, publish it, and check it appears on **The farm** page.
7. **Payments:** fill in (test) bank details and save. A new EFT order now shows them on the confirmation page. The PayFast status reads "not set up yet".
8. **Dashboard:** the tiles (orders to handle, awaiting payment, paid this month), the 14-day chart (hover a bar), and "Needs attention" (open orders, low stock, privacy requests).
9. **Privacy requests:** set the test deletion request to *done* with a note.

## Switching on online payments (when the client confirms)
1. The client opens a **PayFast** merchant account in the business's name and gets verified.
2. In **Supabase → Edge Functions → Secrets**, add `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `SITE_URL=https://<live domain>` and `PAYFAST_SANDBOX=true`.
3. Place a sandbox order and pay with PayFast's test card. The order flips to **Paid** by itself, and **Admin → Payments → Payment log** shows the notification.
4. Set `PAYFAST_SANDBOX=false`, then switch **"Offer Pay online"** on in Admin → Payments.

## Before launch
1. In **Admin → Site settings**, fill in the real registered name, CIPC number, POPIA Information Officer and email. The legal pages use these values.
2. Create the real owner account, make it admin, then run `cleanup_test_data.sql` and delete the five test accounts (admin, editor, no-access, customer).
3. Fill in the real bank details in **Admin → Payments** and set real stock levels.
4. In the Supabase dashboard: set the Auth Site URL to the live domain, turn on "Leaked password protection", and keep "Confirm email" on.
5. Replace the placeholder photos with real farm photos.
6. Have the Privacy Policy, Terms and Orders & Returns policy reviewed by an attorney before launch. They're a solid POPIA-aligned starting point, not legal advice.
