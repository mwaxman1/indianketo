# indianketo

A programmatic SEO affiliate content site for Indian keto cooking — recipes, guides, and Amazon product roundups monetized via Amazon Associates. Static Astro site deployed to indianketo.com on Vercel, recently migrated from Astro 6 to Astro 7.

## Overview

- **Content collections** (`src/content/`): 8 MDX articles (indian-keto-diet, indian-keto-recipes, keto-paneer-recipes, keto-roti-alternatives, cauliflower rice, meal plans, breakfast, snacks) and 4 product roundups (spice grinders, keto cookbooks, keto flours, nonstick pans) — Zod-validated schemas in `src/content.config.ts`, with roundups carrying structured product entries (name, price, rating, ASIN, pros/cons)
- **Affiliate engine** (`src/config/affiliate.ts`): single source of truth for Amazon Associates links — `buildAmazonProductUrl(asin)` and `buildAmazonSearchUrl(keywords)` append the configured tag (`indianketo-20`), with format validation on the env-provided tag
- **SEO**: FAQPage + Website JSON-LD on the homepage, `StructuredData.astro` component, sitemap (admin paths excluded), canonical URLs, OG/Twitter meta, MDX rehype heading anchors (rehype-slug + autolink-headings)
- **Newsletter**: `NewsletterSignup.astro` component posting to `/api/loops-subscribe.ts` — currently a placeholder that logs emails and returns success; the Loops API wiring is flagged but not yet implemented
- **Migration tooling**: `BUILD_PROMPT_astro7.md` + `dispatch_astro7.sh` document the Astro 6→7 migration run through the `cc` worktree harness (bump deps, sweep for breakage greps, build verification, JSON-LD spot-checks)
- Standard pages: index, articles index/detail, roundups index/detail, about, contact, privacy, terms, affiliate disclosure, 404

## Tech Stack

- **Framework:** Astro 7 (`^7.3.1`), static output, Vercel adapter, MDX
- **Styling:** Tailwind CSS 4 (`4.3.1`) + `@tailwindcss/typography`, via `@tailwindcss/vite`; Vite 8
- **Content:** MDX with Zod content schemas, rehype-slug, rehype-autolink-headings
- **SEO:** `@astrojs/sitemap`, JSON-LD structured data
- **Language:** TypeScript
- **Hosting:** Vercel (indianketo.com)

## Getting Started

```bash
npm install
npm run dev        # dev server on 0.0.0.0:5000
npm run build      # static build
npm run preview    # preview on 0.0.0.0:5000
```

Environment: `PUBLIC_AMAZON_AFFILIATE_TAG` (falls back to the hardcoded `indianketo-20`).

## Features

- Two content collections (articles + product roundups) with typed frontmatter and structured product data
- Centralized Amazon affiliate link generation with tag validation — every roundup links through the Associates tag
- Rich SEO foundation: JSON-LD (FAQPage/Website/Article), auto sitemap, heading anchor links, canonical/OG/Twitter tags
- Newsletter signup component with API-route hook (Loops integration stubbed, marked TODO)
- Fully static build with immutable asset caching on Vercel
- Documented agent-driven migration workflow (worktree-based Astro 6→7 upgrade with verification gates)