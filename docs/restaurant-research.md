# Restaurant research

This is the agreed collection scope for researching Budapest restaurants that
serve ramen. Research is broader than the public directory: collecting a fact
does not mean displaying it. This specification does not yet change the site's
content schema or certify the existing listings against these requirements.

## Unit of research

Research each physical branch separately, with a stable location ID and an
optional shared brand ID. Include ramen specialists and broader restaurants
serving ramen, distinguishing the two. Track candidates before publication;
incomplete research must not require invented values just to satisfy the current
public listing schema.

## Collection checklist

| Area              | Collect                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Identity          | Name, branch name, brand, ramen specialist or broader restaurant serving ramen                                             |
| Location          | Full address, district, coordinates, Google Maps URL                                                                       |
| Official presence | Website, Instagram, Facebook                                                                                               |
| Menu              | Preferred direct menu URL, source type, menu date if visible, cached originals, capture date                               |
| Food              | Ramen styles, broth and toppings needed to identify those styles, vegetarian ramen, vegan ramen                            |
| Prices            | Internal bowl prices supporting the minimum and maximum, HUF currency, price basis, date checked, mandatory service charge |
| Visiting          | Opening hours including exceptions when known, operating status, reservations and booking link                             |
| Availability      | Regular, lunch-only, selected days, seasonal, or occasional ramen service, with details                                    |
| Ordering          | Delivery and takeaway availability and links; separately tablet, kiosk, and QR ordering inside the restaurant              |
| Customization     | Whether ramen can be customized and which changes are confirmed                                                            |
| Ownership         | Japanese-owned and Hungarian-owned independently; Japanese chef involvement separately                                     |
| Evidence          | Per-fact source references, date checked, supporting note, unresolved conflicts                                            |

Ramen styles can overlap: retain multiple labels. Check broth and toppings before
confirming vegetarian or vegan options. Do not infer ownership from names,
branding, cuisine, or the nationality of a chef. Mixed Japanese and Hungarian
ownership can make both ownership flags true.

## Knowledge and evidence

Every yes/no feature has three explicit states: `yes`, `no`, and `unknown`.
Both `yes` and `no` require affirmative supporting evidence. Failure to find a
booking button, menu option, or ordering device establishes neither absence nor
impossibility. Record missing non-boolean information as unknown, not as an empty
value that could be mistaken for a confirmed absence.

Attach evidence to individual facts rather than relying on one source date for
the entire restaurant. Each evidence record includes a source URL where available,
source type (official website, official social account, Maps, ordering platform,
or firsthand observation), date checked, and a short supporting note. Firsthand
observations should identify the observation date and observer. Distinguish the
date checked from the menu's publication date or a photo's date.

Prefer current, branch-specific official information. Retain conflicting evidence
and mark unresolved facts unknown rather than silently choosing a value. A page
that no longer loads does not prove the restaurant has closed.

Operating status supports open, temporarily closed, permanently closed, and
unknown. This is separate from opening hours and whether the shop is open now.

## Menu sources and caching

Prefer a direct menu on the official website. If unavailable, use the menu listed
on Google Maps. Official social posts or ordering platforms can supplement gaps,
with their limitations recorded. A general Maps listing is not a verified direct
menu link; identify the actual menu or photo when possible.

Keep research outside the public asset directory and Astro's published restaurant
collection. The intended layout is one record per location under
`research/restaurants/<location-id>/`, with cached files under its `menus/`
directory. This is a storage convention for the research pass, not an implemented
loader or validation schema.

Cache original PDFs and menu images; preserve a readable snapshot for HTML menus.
For every cached file record its relative path, original source URL, capture date,
source type, visible menu date if present, and branch applicability. Keep extracted
text and interpreted facts separate from the originals. Preserve dated versions
when menus change. Record inaccessible sources and missing caches explicitly.

## Price range rule

Use the cheapest and most expensive standard, full-size standalone ramen bowls
on the same current dine-in menu. Exclude optional extras, combos, delivery
markups, temporary promotions, and smaller portions. Retain the qualifying bowl
names and prices internally so the range can be audited. Do not mix branches or
menu versions when calculating a range.

Record mandatory service charges separately, including the percentage or fixed
amount and applicability when known. Unknown charges are not zero charges.
If only delivery prices, incomplete menus, or undated photos are available,
record that limitation; do not present an estimated or partial range as a verified
current dine-in range. When a range is displayed, label its price basis clearly.

## Publication boundary

The website selects a subset of researched facts. Do not replicate full menus or
individual bowl prices on the website. A verified ramen price range, useful
features, official links, and last-checked information are potential public
fields; their collection does not commit us to displaying them now.

Unknown values must remain unknown when projecting research into site content.
In particular, the current boolean dietary fields cannot represent the full
research model and must not force an unknown result to false. Existing listings
need the same evidence review as newly discovered restaurants.
