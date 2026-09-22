# SPEC: Indian Keto — design-system rebuild + Ketolife.in launch

## Why this exists

Mike's verdict: "the UX on indianketo.com is unacceptable." That is measured, not
aesthetic. Live audit of https://indianketo.com (1280px):

- **ZERO images on the entire homepage.** No `<img>` elements at all. The hero is
  a 5-emoji block (🥘 🥑 🌿) in a plain colored div.
- **Webfonts never load.** `document.fonts`: 42 faces, every one `unloaded`;
  `document.fonts.check('16px "Inter Tight"')` returns **false** in a real browser.
  Root cause: `<link href="fonts.googleapis.com/..." media="print"
  onload="this.media='all'">` — the stylesheet is fetched but its font files never
  load, so all display type renders in the system fallback.
- **17 tap targets under 44px** (mobile usability failure).
- Typography scale collapses (--text-xl == --text-lg == 20px, --text-3xl == 28px)
  and body text is 12–14px.

Two deliverables:
1. `indianketo.com` — full visual rebuild to a professional, mobile-first,
   responsive standard, using the real photography already prepared in this repo.
2. `ketolife.in` — a second, sister site, launched from the same build system.

## Assets already in the repo — USE THEM, do not generate or invent images

- `src/assets/photos/*.jpg` — **16 licence-cleared photographs**, already cropped per
  slot, with a typed manifest at `src/data/photos.ts` exporting `photo(slug)` and a
  `Photo` interface (`src` ImageMetadata, `alt`, `title`, `license`, `creator`,
  `sourceUrl`, `lqip`). Render them through Astro's `<Image>` component from
  `astro:assets` (it emits AVIF/WebP + srcset at build time). This is the primary
  fix for the "unacceptable" verdict — a food site with no food photography.
- `public/fonts/*.woff2` + `public/fonts/manifest.json` — Inter (400/500/600/700)
  and Fraunces (400/600/700) in latin + latin-ext, self-hosted. **Delete the
  Google Fonts `<link>` and `<noscript>` block from BaseLayout entirely** and
  declare `@font-face` rules in `global.css` with `font-display: swap` and
  `unicode-range` for latin / latin-ext. Font files must be served from `/fonts/`.
- Available photo slugs (use verbatim):
  `hero-paneer-karahi` (hero),
  `wide-chicken-skewers` (wide section band),
  `ghee-jar` (square),
  and these cards: `paneer-tikka-skewers`, `butter-chicken-bowl`, `egg-curry-anda`,
  `lamb-korma-bowl`, `mutton-curry-bowl`, `okra-masala-bowl`, `gobi-masala-bowl`,
  `masala-dabba`, `spice-box-topdown`, `whole-spices-plate`, `chicken-tikka-plate`,
  `kofta-korma-bowl`, `og-default`.

## The single most important instruction

**A placeholder IS the defect.** Do not ship an emoji, an empty colored div, a
plain box, or a "coming soon" block where a photograph or an icon belongs. Every
visual slot gets a real asset from the repo or a real inline SVG icon. If you
believe an asset is missing, stop and report — do not substitute a placeholder.

## C1 — Design tokens and type scale (`src/styles/global.css`)

- Keep the existing brand palette (deep green `#1B5E20` primary, turmeric gold
  `#D4A017` accent) — recolouring the brand is a regression.
- Set `--font-display: Fraunces, Georgia, serif` and
  `--font-body: Inter, system-ui, sans-serif`. Fraunces gives the food-editorial
  character; Inter carries UI and body copy.
- Define a real modular scale that does not collapse:
  `--text-xs:12px --text-sm:14px --text-base:16px --text-lg:18px --text-xl:20px
   --text-2xl:24px --text-3xl:30px --text-4xl:38px --text-5xl:48px --text-6xl:60px`
  with matching line-heights. **No text below 12px anywhere.** Body copy is 16px
  minimum on mobile.
- Add `@font-face` blocks for all 14 faces with correct `unicode-range`.
- **Tailwind v4:** write custom utilities as plain CSS, never `@apply` on a custom
  class. `space-x-*`/`space-y-*` do not exist in v4 — use `gap-*` on a flex/grid
  parent.
- Add `@media (prefers-reduced-motion: reduce)` disabling all animation/transition.

## C2 — Homepage rebuild (`src/pages/index.astro`)

Mobile-first; every section must work at 390px before it is styled for 1440px.

1. **Hero** — `hero-paneer-karahi` as a real `<Image>` (eager, `fetchpriority="high"`,
   LQIP as container background). Fraunces display headline, the accent phrase in
   the existing style. Both CTAs keep their current hrefs (`/articles`, `/roundups`).
   Do NOT stack the CTAs vertically on desktop.
2. **Trust strip** — replace the emoji/icon rows with a real inline SVG icon set
   (one `Icon.astro` component with a name→path map, stroke-based, `currentColor`).
   No emoji anywhere in rendered HTML.
3. **Featured guides** — a card grid driven by real data, NOT the current hardcoded
   array. Each card renders the matching photograph via `<Image>` with `loading="lazy"`,
   the LQIP background, `aspect-[4/3]`, and `object-cover`. Pair each of the 8
   articles with a relevant slug (e.g. paneer article → `paneer-tikka-skewers`,
   egg article → `egg-curry-anda`, snacks → `okra-masala-bowl`); use
   `chicken-tikka-plate`, `butter-chicken-bowl`, `lamb-korma-bowl`,
   `gobi-masala-bowl`, `mutton-curry-bowl` to cover the remainder.
4. **Wide band** — full-bleed `wide-chicken-skewers` with the headline overlaid on
   a legibility scrim (a gradient overlay, not a flat box).
5. **Ingredient/spice section** — `masala-dabba`, `spice-box-topdown`,
   `whole-spices-plate`, `ghee-jar` in a real composition.
6. **Newsletter** — keep the EXISTING Sequenzy form contract byte-identical:
   POST `https://api.sequenzy.com/api/v1/forms/s3ean6yt56t58wha6iklj9uo`,
   urlencoded, fields `email` + `referrer`. Do not change the endpoint, the form id,
   or the field names. Restyle only.
7. Add a footer credits line linking to `/disclosure` (photo credits live there).

## C3 — All other pages

- `articles.astro`, `roundups.astro`, `[slug].astro` for both collections,
  `about/contact/privacy/terms/disclosure/404`: apply the same system. Article and
  roundup cards get photographs. `[slug].astro` pages get a hero image when the
  article maps to a slug (add an optional `image` field to the content schema and
  to each MDX frontmatter — this is expected and in-scope, it is in the file list).
- Article pages: readable measure (`max-w-prose` ~68ch), 16px+ body, generous
  line-height, styled blockquotes/tables/lists via the prose layer.
- `/disclosure` must gain a **photo credits** section listing each photograph's
  creator, licence, and source link — read them from `photos.ts`, do not hand-type.
- `404.astro` gets a real design and a route back home.

## C4 — Accessibility and responsiveness (hard gates)

- Every `<a>`/`<button>` has a hit area **≥44×44px** on mobile.
- `:focus-visible` ring on every interactive element.
- Alt text: use `photo(slug).alt` — never empty, never "image".
- Zero horizontal overflow at 390 / 768 / 1280
  (`document.documentElement.scrollWidth <= innerWidth`).
- Mobile header: logo + hamburger only below `md`; nav links and the CTA live in
  the mobile menu as full-width buttons.

## C5 — ketolife.in (sister site)

ketolife.in is a second GoDaddy-registered property, currently parked on
CashParking nameservers (http 200, JS redirect to `/lander`, which 504s — it has
no working site). Build it as a **distinct property, not a copy**:

- Create `~/projects/ketolife/` as a fresh Astro 7 + Tailwind v4 + Vercel static
  site (mirror indianketo's `astro.config.mjs`, mdx + sitemap + vercel adapter).
- **Different brand system**: its own palette, its own type pairing, its own
  layout rhythm — a visitor must not think it is the same site as indianketo.com.
  Do NOT reuse indianketo's green/gold tokens or its component markup.
- Content: a keto living/recipe magazine — homepage, `/articles` index with 6
  written article pages, `/about`, `/contact`, `/privacy`, `/terms`, `404`.
  Content must be real, specific, written prose (no lorem ipsum, no placeholder
  text, no invented statistics or medical claims).
- Reuse the photograph set by copying the files from
  `~/projects/indianketo/src/assets/photos/` into `src/assets/photos/` and writing
  its own `src/data/photos.ts` manifest (same `Photo` shape). Copy the self-hosted
  fonts from `~/projects/indianketo/public/fonts/` (or re-fetch Inter + Fraunces
  from Google's CSS API). Self-host them — no `fonts.googleapis.com` link.
- `site: 'https://ketolife.in'`, correct canonical URLs, sitemap, OG/Twitter meta.
- **Lead capture is wired to Sequenzy, not a placeholder** (Mike's standing rule):
  a second `kc-email-capture` form posting to the same Sequenzy endpoint used by
  indianketo, fields `email` + `referrer`.
- Deploy to a NEW Vercel project named `ketolife` (do NOT touch the `indianketo`
  project). Do not attach the domain — DNS is a separate owner decision.

## Verification (run all of these and paste the real output)

```bash
# indianketo
cd ~/projects/indianketo && npm run build 2>&1 | tail -5
grep -c 'fonts.googleapis.com' src/layouts/BaseLayout.astro      # expect 0
grep -c '@font-face' src/styles/global.css                        # expect >= 14
grep -rc 'text-\[1[01]px\]' src/ | grep -v ':0' || echo "no sub-12px: OK"
grep -rl 'fonts.googleapis.com' dist/ || echo "no google fonts in build: OK"
ls dist/_astro/*.avif | wc -l                                     # expect > 0 (images optimised)
# rendered check — no page may be image-less
for f in dist/index.html dist/articles/index.html dist/roundups/index.html; do
  printf "%s img=%s\n" "$f" "$(grep -o '<img' $f | wc -l)"; done

# ketolife
cd ~/projects/ketolife && npm run build 2>&1 | tail -5
ls dist/index.html dist/articles/index.html
grep -c 's3ean6yt56t58wha6iklj9uo' src/ 2>/dev/null       # expect >= 1 (lead form wired)
grep -rL '<img' dist/*.html || true
```

Report, at the top of your reply: files changed (`git diff --stat`), the literal
model you ran as, the build result, and every verification command's real output.
If any change beyond the file list above is required, make it only if it is inside
a file already listed, and flag it explicitly at the top of your report. A change
in an unlisted file requires stopping and reporting.
