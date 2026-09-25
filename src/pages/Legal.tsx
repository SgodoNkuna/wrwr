import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useConsent } from "../lib/consent";
import { useSettings } from "../lib/settings";
import { usePageMeta } from "../lib/usePageMeta";

const UPDATED = "25 September 2026";

function LegalShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  usePageMeta(title, intro);
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="text-5xl text-farm-900 sm:text-6xl">{title}</h1>
      <p className="mt-2 text-sm text-ink/70">Last updated: {UPDATED}</p>
      <div className="legal mt-8 space-y-4 leading-relaxed text-farm-950/85 [&_h2]:mt-8 [&_h2]:text-3xl [&_h2]:text-farm-900 [&_li]:ml-5 [&_li]:list-disc [&_a]:font-semibold [&_a]:text-farm-700 [&_a]:underline">
        <p>{intro}</p>
        {children}
      </div>
    </div>
  );
}

function useBiz() {
  const { business: b } = useSettings();
  const officer = b.information_officer || "the owner of the business";
  const email = b.email || "our email address (to be published)";
  return { b, officer, email, legal: b.legal_name || b.name };
}

function ContactBlock() {
  const { b, officer, email, legal } = useBiz();
  return (
    <ul>
      <li><b>Responsible party:</b> {legal}{b.registration_number && ` (registration no. ${b.registration_number})`}</li>
      <li><b>Information Officer:</b> {officer}</li>
      <li><b>Address:</b> {b.address}</li>
      <li><b>Phone / WhatsApp:</b> {b.phone}</li>
      <li><b>Email:</b> {email}</li>
    </ul>
  );
}

export function PrivacyPolicy() {
  const { legal } = useBiz();
  return (
    <LegalShell title="Privacy Policy" intro={`This policy explains how ${legal} ("we", "us") collects, uses and protects your personal information in line with the Protection of Personal Information Act 4 of 2013 (POPIA).`}>
      <h2>1. Who we are</h2>
      <ContactBlock />

      <h2>2. What we collect</h2>
      <ul>
        <li><b>Enquiries:</b> your name, phone number, optional email address, the product you ask about, the quantity and your message.</li>
        <li><b>WhatsApp and phone calls:</b> when you contact us on WhatsApp or by phone, we receive your number and your messages.</li>
        <li><b>Orders:</b> your name, cellphone, optional email, what you ordered, how you'll collect it or where to deliver it, and how you paid. We never see or store card numbers; online payments are handled by PayFast.</li>
        <li><b>Customer accounts (optional):</b> your email, name, cellphone and a password (stored only in hashed form).</li>
        <li><b>Staff accounts:</b> the email, name and password of our staff (the password is stored only in hashed form).</li>
        <li>We do <b>not</b> use analytics, advertising trackers or marketing cookies.</li>
      </ul>

      <h2>3. Why we use it (purpose and lawful basis)</h2>
      <ul>
        <li>To answer your enquiry, send prices and availability, and arrange a sale or collection. You give <b>consent</b> when you submit the form, and the processing is needed to take the steps you asked for before a sale (POPIA s11(1)(a) and (b)).</li>
        <li>To process and fulfil your order and take payment. This is needed to perform our agreement with you (s11(1)(b)), and we keep sales records because tax law requires it (s11(1)(c)).</li>
        <li>To keep our website secure and prevent abuse, which is our <b>legitimate interest</b> (s11(1)(f)).</li>
        <li>We never sell your information, and we don't send direct marketing unless you have asked for it.</li>
      </ul>

      <h2>4. Who we share it with</h2>
      <p>We use trusted service providers ("operators") that process information on our instructions:</p>
      <ul>
        <li><b>Supabase</b>: database and login hosting. Data is stored on servers in the United States.</li>
        <li><b>Vercel</b>: website hosting.</li>
        <li><b>PayFast</b>: only if you choose to pay online. PayFast receives your name, email and the order amount, and handles your card details itself.</li>
        <li><b>WhatsApp (Meta)</b>: only when you choose to contact us on WhatsApp.</li>
        <li><b>Resend</b>: sends order confirmations and updates to your email address, if you gave one.</li>
        <li><b>Cloudflare Turnstile</b>: if switched on, checks at checkout that you're a person and not a bot. It doesn't track you across other websites.</li>
        <li><b>Google Maps</b>: only if you accept cookies or click "Load map".</li>
      </ul>
      <p><b>Cross-border transfer (s72):</b> some of these providers store data outside South Africa. We only use providers that are bound by agreements or laws that give protection substantially similar to POPIA. By submitting an enquiry, you agree to this transfer.</p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li>Enquiries are <b>deleted automatically after 24 months</b>, or sooner if you ask.</li>
        <li>Orders and payment records are kept for 5 years, as required for tax records, then deleted automatically.</li>
        <li>Privacy requests and our staff activity audit log are deleted automatically after 36 months.</li>
        <li>If you have an account, you can close it at any time from <b>My account → Privacy</b>.</li>
        <li>Records we must keep by law (for example tax records of a sale) are kept for the period the law requires.</li>
      </ul>

      <h2>6. How we protect it</h2>
      <p>Access is limited to authorised staff with individual accounts, role-based permissions and optional two-step sign-in. High-risk actions (such as deleting records) need a second person to approve them. Every staff change is logged. Data is encrypted in transit (HTTPS), and the database enforces row-level security. If a security breach affects your information, we will notify you and the Information Regulator as required by POPIA s22.</p>

      <h2>7. Your rights</h2>
      <p>Under POPIA you may:</p>
      <ul>
        <li>ask whether we hold your information and request a copy of it;</li>
        <li>ask us to correct or delete it;</li>
        <li>object to processing, or withdraw your consent at any time (this doesn't affect processing that already happened);</li>
        <li>lodge a complaint with the Information Regulator.</li>
      </ul>
      <p>If you have an account, you can download your information or ask us to delete it from <Link to="/account">My account</Link>. Otherwise, contact our Information Officer using the details above. We will respond within a reasonable time, and we may need to confirm your identity first.</p>

      <h2>8. Information Regulator</h2>
      <p>If you're unhappy with how we handled your information, you can complain to the Information Regulator (South Africa) at <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer">inforegulator.org.za</a>.</p>

      <h2>9. Cookies</h2>
      <p>See our <Link to="/cookies">Cookie Policy</Link>.</p>

      <h2>10. Changes</h2>
      <p>We may update this policy. The "last updated" date above shows when it last changed.</p>
    </LegalShell>
  );
}

export function TermsOfUse() {
  const { legal, b } = useBiz();
  return (
    <LegalShell title="Terms of Use" intro={`These terms apply to your use of this website operated by ${legal}. By using the site you agree to them.`}>
      <h2>1. Information on this site</h2>
      <p>Product descriptions, photos, prices and availability are given in good faith for information only. They are <b>not an offer</b> and may change without notice. Livestock differ from animal to animal, so photos may not show the exact animal you will receive.</p>

      <h2>2. Prices and quotes</h2>
      <p>Prices are in South African Rand (ZAR). Where a price is shown, it is a guide unless we confirm it in writing (including on WhatsApp). "Enquire for price" items are quoted individually. A sale is only concluded once we both confirm it, and payment terms are agreed at that time.</p>

      <h2>3. Online orders</h2>
      <p>When you place an order on this site we check stock and prices again. The order is accepted when we confirm it (we'll WhatsApp or email you). If we can't supply something, we'll tell you and refund anything you have paid for it. Our <Link to="/returns">Orders &amp; Returns policy</Link> explains cancellations and refunds.</p>
      <p><b>Payment security:</b> card and Instant EFT payments are processed by PayFast, a registered South African payment provider. We never see or store your card details.</p>

      <h2>4. Livestock, poultry and produce</h2>
      <ul>
        <li>Buyers should inspect animals at collection. Where we state that poultry is vaccinated, we'll give the vaccination details on request.</li>
        <li>Once animals have been collected, the buyer is responsible for transport, housing, feed, biosecurity and compliance with any movement or veterinary requirements (including the Animal Diseases Act 35 of 1984 and any official movement controls).</li>
        <li>Fresh produce is perishable and must be collected or delivered as agreed.</li>
        <li>Nothing in these terms limits your rights under the Consumer Protection Act 68 of 2008, where that Act applies.</li>
      </ul>

      <h2>5. Use of the website</h2>
      <p>You may not misuse the site. For example, you may not send spam or false enquiries, try to access the admin area without permission, or interfere with its security. Content and branding on the site belong to {legal} and may not be copied for commercial use without permission.</p>

      <h2>6. Limitation of liability</h2>
      <p>To the extent the law allows, we are not liable for indirect or consequential loss arising from use of this website or reliance on its content. The site is provided "as is" and may sometimes be unavailable.</p>

      <h2>7. Links</h2>
      <p>Links to WhatsApp, Google Maps and other third-party services are provided for convenience. We are not responsible for their content or practices.</p>

      <h2>8. Governing law</h2>
      <p>These terms are governed by the laws of the Republic of South Africa.</p>

      <h2>9. Business information (ECT Act s43)</h2>
      <ul>
        <li><b>Name:</b> {legal}{b.registration_number && ` · Registration no. ${b.registration_number}`}</li>
        <li><b>Physical address:</b> {b.address}</li>
        <li><b>Phone:</b> {b.phone}{b.email && <> · <b>Email:</b> {b.email}</>}</li>
        <li><b>Website privacy policy:</b> <Link to="/privacy">Privacy Policy</Link></li>
      </ul>
    </LegalShell>
  );
}

export function CookiePolicy() {
  const { reopen, choice } = useConsent();
  return (
    <LegalShell title="Cookie Policy" intro="This page explains the cookies and similar browser storage this website uses and how you can control them.">
      <h2>Strictly necessary (always on)</h2>
      <ul>
        <li><b>Cookie choice</b> (<code>tshehla-cookie-consent-v1</code>, local storage): remembers your cookie choice.</li>
        <li><b>Login session</b> (<code>sb-…-auth-token</code>, local storage): keeps you signed in if you have a customer or staff account.</li>
        <li><b>Basket</b> (<code>tshehla-basket-v1</code>, local storage): remembers what you've added to your basket.</li>
        <li><b>Recent orders</b> (<code>tshehla-recent-orders</code>, session storage): lets you see the order you just placed. It's cleared when you close the tab.</li>
      </ul>
      <h2>Third-party (only with your consent)</h2>
      <ul>
        <li><b>Google Maps</b> on the Contact page: Google may set cookies when the map loads. It loads only if you click "Accept all" or "Load map".</li>
        <li><b>Cloudflare Turnstile</b> at checkout (if switched on): a security check that stops bots from placing fake orders. It is strictly necessary for the checkout to work safely.</li>
      </ul>
      <h2>What we don't use</h2>
      <p>No analytics, advertising, social-media tracking pixels or cross-site marketing cookies.</p>
      <h2>Change your choice</h2>
      <p>Your current choice: <b>{choice ?? "not set"}</b>.</p>
      <button onClick={reopen} className="btn-green">Change cookie settings</button>
    </LegalShell>
  );
}

export function PaiaNotice() {
  const { legal } = useBiz();
  return (
    <LegalShell title="PAIA Notice" intro={`Access to information held by ${legal} under the Promotion of Access to Information Act 2 of 2000 (PAIA).`}>
      <h2>Contact details</h2>
      <ContactBlock />
      <h2>Records we hold</h2>
      <ul>
        <li>Customer enquiries and sales correspondence</li>
        <li>Product and stock records</li>
        <li>Financial and tax records, as required by law</li>
        <li>Staff and website account records</li>
      </ul>
      <h2>How to request access</h2>
      <p>Send a written request to the Information Officer using the details above. Describe the record you want and how you'd like to receive it. Requests are handled in line with PAIA, and the prescribed fees and grounds for refusal may apply.</p>
      <p>Private bodies with fewer than 50 employees and a turnover below the prescribed threshold are exempt from compiling a full PAIA manual. This notice is published voluntarily for transparency. The Information Regulator's guide on how to use PAIA is available at <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer">inforegulator.org.za</a>.</p>
      <p>Personal-information requests under POPIA: see our <Link to="/privacy">Privacy Policy</Link>.</p>
    </LegalShell>
  );
}

export function ReturnsPolicy() {
  const { b, email } = useBiz();
  return (
    <LegalShell title="Orders & Returns" intro="How ordering, cancelling and refunds work for things you buy from us online or over WhatsApp.">
      <h2>1. Placing an order</h2>
      <p>Only items with a price on the website can be ordered online. For livestock and anything marked "Ask for a price", WhatsApp us for a quote. After you order, we confirm availability and let you know when your order is ready to collect or when delivery is arranged.</p>

      <h2>2. Paying</h2>
      <ul>
        <li><b>EFT:</b> use your order number as the reference. We start preparing your order once the payment reflects.</li>
        <li><b>Pay on collection:</b> pay cash or card when you collect at the farm.</li>
        <li><b>Online (card / Instant EFT):</b> when this is switched on, payments go through PayFast.</li>
      </ul>

      <h2>3. Cancelling</h2>
      <p>You can cancel an order at any time before it's collected or sent out. WhatsApp or call us on {b.phone}{email && ` or email ${email}`}. If you've already paid, we'll refund the full amount to the account you paid from, normally within 7 working days.</p>
      <p><b>Cooling-off (ECT Act s44):</b> for online orders you may also cancel within 7 days after receiving the goods, without giving a reason. You pay only the direct cost of returning them. Under s42 of the Act, this does <b>not</b> apply to goods that go off or deteriorate quickly, such as fresh produce and live day-old chicks.</p>

      <h2>4. Live animals</h2>
      <ul>
        <li>Please inspect animals and chicks when you collect them. If something isn't right, tell us before you leave the farm.</li>
        <li>Once animals have left the farm, their care, feed, housing and transport are the buyer's responsibility.</li>
        <li>If there's a problem with poultry you bought from us, contact us within 24 hours of collection with photos, and we'll look at it with you fairly.</li>
      </ul>

      <h2>5. Fresh produce</h2>
      <p>Produce is picked for your order. If it isn't in good condition when you receive it, let us know the same day and we'll replace or refund it.</p>

      <h2>6. Your rights</h2>
      <p>Nothing here takes away your rights under the Consumer Protection Act 68 of 2008 or the Electronic Communications and Transactions Act 25 of 2002, where they apply.</p>
    </LegalShell>
  );
}
