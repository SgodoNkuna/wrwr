# Design notes: not looking like an AI template

AI-generated sites converge on the same statistically "safe" defaults. We audited the v1 build
against the most commonly cited giveaways and replaced each one with something specific to this farm.

Sources: [The Purple Gradient Problem (DEV)](https://dev.to/james_anderson_h/the-purple-gradient-problem-why-ai-ui-all-looks-alike-and-how-to-fix-it-3j65),
[AI Slop Web Design guide (925 Studios)](https://www.925studios.co/blog/ai-slop-web-design-guide),
[AI Slop Design fix guide (VibeCodeKit)](https://vibecodekit.dev/ai-slop-design),
[Top 10 signs a website was built by AI](https://sikora.software/blog/ai-website-design),
[Web textures (Webflow)](https://webflow.com/blog/web-textures).

| Giveaway | v1 had it? | What we do instead |
|---|---|---|
| Inter / system sans everywhere | Yes | **Anton** (heavy condensed caps, matching the client's own Tau Poultry flyer), **Atkinson Hyperlegible** for body text (made for low-vision readers, with a distinctive slashed zero), **Caveat** for handwritten bits. Self-hosted, so no Google Fonts calls, which also helps POPIA. |
| Gradient hero with glowing orbs | Yes | Flat paper background with a subtle **grain texture**. The hero is the client's real **flyer, taped up** at an angle like a notice. |
| Pill badge above the headline | Yes | Plain letter-spaced place name ("Letsitele, Limpopo"). |
| Row of 3–4 icon-in-circle feature cards | Yes (twice) | Removed. A **"Fully vaccinated" rubber stamp** on the flyer, and categories set as big typographic headings with product links, not cards. |
| Same rounded corners and soft shadow on everything | Yes | Mostly square: 2px ink borders, a hard offset shadow on the main button, and ticket-cut price tags. Rounding appears only where it means something (the WhatsApp button). |
| Generic "Popular right now" product grid | Yes | A **chalkboard "Today at the farm gate" price board**: dotted leaders, handwritten prices, sold-out items struck through, and a "prices as at" date, all generated from live stock and prices. |
| Centered CTA band ("Ready to get started?") | Yes | A **handwritten sticky note, "How buying works"**. Its text is generated from which products can actually be ordered online and which need a WhatsApp enquiry, so it's always true. |
| Generic headline copy | Somewhat | "Raised on Gunyula Farm". The copy names real places, real products and how people actually buy (WhatsApp, collect at the farm). |
| Lucide icons as decoration | Yes | Icons appear only where they do a job (basket, phone, WhatsApp, admin nav). Placeholder product images are a kraft "label", not a stock icon. |
| Pill-shaped nav buttons | Yes | Plain text links with an underline for the active page. The WhatsApp link shows the actual number. |
| Four-column footer | Yes | A sentence-style colophon ("Tshehla AgriHub, Gunyula Farm 38… Call or WhatsApp…"), plus the small print on one line. |
| Em dashes in copy | No | Kept that way. The UI copy uses commas, colons and full stops. |
| Fake testimonials and stats ("10k+ happy customers") | No | Kept that way. Nothing is invented. Add real reviews only when the client has them. |
| Fade-in-on-scroll everything | No | Kept that way. Motion is limited to small hover responses. |

## Accessibility
Every colour pair is checked against WCAG 2 AA (4.5:1 for text). An automated axe scan of 23 pages runs in CI and fails the build on any serious or critical issue. The first version failed several checks (orange button text, muted grey text, WhatsApp green); the palette below is the corrected one.

## Palette
Taken from the client's own material, not a framework default:
forest green `#1f4d2b`, chick yolk `#f4a51c`, ember `#c44612` (darkened from the flyer's `#e2561b` for contrast), WhatsApp green `#177a41`, cardboard kraft `#c49a6c` / `#745634`, paper `#f5efe2`, ink `#1d2a1f`.

## What would make it even less "template"
Real photos of the farm, the animals and the people, taken on a phone in good light. Nothing
signals "real business" more than that, and it's the biggest remaining gap. Swap the TEST images
through **Admin → Products** as soon as photos are available.
