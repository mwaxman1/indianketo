# Spec: wire Vercel Web Analytics into indianketo

## Why

The `indianketo` Vercel project has Web Analytics **enabled** (project id
`prj_GRVptImFU3DQ8pCrDF3F7WwAE9lC`, webAnalytics id `gdsx0l9MPATd55j913Sb2nZ2Y`)
and Speed Insights enabled, but **no page loads the insights script**, so the
dashboard collects nothing. `https://indianketo.com/_vercel/insights/script.js`
returns 200 (the endpoint is live) while the served HTML contains
`0` references to `_vercel/insights`. Analytics is therefore inert.

The owner's stated preference is free Vercel Web Analytics. GA4
(`G-TR0TGL1NGM`) already works and must **not** be touched or removed.

## Scope — exactly these files

- `src/layouts/BaseLayout.astro` (only file that may change, unless a
  verification step reveals a second file is genuinely required — in that case
  STOP and report instead of expanding scope)

## Required change

In `src/layouts/BaseLayout.astro`, inside `<head>`, add a deferred first-party
script that loads Vercel Web Analytics:

```html
<script is:inline defer src="/_vercel/insights/script.js"></script>
```

Rules:

1. Use `is:inline` — Astro must not hoist, bundle or rewrite this tag. The path
   is served by the Vercel platform, not by the build output.
2. `defer` is required; do not make it render-blocking.
3. Do **not** add any npm dependency (`@vercel/analytics` is NOT wanted — a
   plain script tag avoids a dependency and works for a static Astro build).
4. Do **not** modify, move, or remove the existing deferred GA4 block, the
   `gaId` value, `G-XXXXXXXXXX` guard, or any Sequenzy code.
5. Do **not** touch fonts, photographs, brand tokens, routes, or copy.
6. Vercel Web Analytics is cookieless and first-party, so no privacy-page change
   is required for this site.

## Verification — run every command, paste real output

1. `npm run build` — must exit 0.
2. Confirm the tag survived the build unmodified:
   `grep -c '_vercel/insights/script.js' dist/index.html` — must be >= 1.
   Also confirm it is still `defer` and still `is:inline`'s output (no
   `type="module"` rewrite):
   `grep -o '<script[^>]*_vercel/insights[^>]*>' dist/index.html`
3. Confirm GA4 is intact:
   `grep -c "G-TR0TGL1NGM" dist/index.html` — must be >= 1.
4. Confirm no Google Fonts regression:
   `grep -rc 'fonts.googleapis.com' dist/ | grep -v ':0' || echo "ZERO google fonts"`.
5. Confirm the Sequenzy contract id is unchanged:
   `grep -rc 's3ean6yt56t58wha6iklj9uo' dist/ | grep -v ':0'` — must show hits.
6. Confirm image count did not regress:
   `grep -c '<picture' dist/index.html` — must be >= 10.

Do NOT commit or push. Report the raw output of each command.
