# Route ALL IndianKeto Email Capture DIRECTLY to Sequenzy (no daisy-chaining)

## Context

Mike's directive: **SWITCH TO SEQUENZY FOR ALL SITES. NO daisy-chaining form solutions.** Every email capture form must POST **directly** to the Sequenzy form endpoint — NOT through a `/api/loops-subscribe` intermediary.

IndianKeto's Sequenzy newsletter form (created 2026-09-09, published):
- **Form ID:** `s3ean6yt56t58wha6iklj9uo`
- **Endpoint:** `https://api.sequenzy.com/api/v1/forms/s3ean6yt56t58wha6iklj9uo`
- **Verified working:** POST with `Content-Type: application/x-www-form-urlencoded` + `Accept: application/json` → `{"success":true}`. **Multipart is REJECTED (HTTP 500)** — use urlencoded or JSON.

## Current state

IndianKeto uses a **daisy-chain**: the `NewsletterSignup.astro` form POSTs to `/api/loops-subscribe`, which is a placeholder that returns success but does NOTHING (no real capture). Mike wants direct Sequenzy.

Files:
- `src/components/NewsletterSignup.astro` (form + fetch to `/api/loops-subscribe`)
- `src/pages/api/loops-subscribe.ts` (placeholder handler — remove)

## Changes

### 1. Delete `src/pages/api/loops-subscribe.ts`
No daisy-chaining. Remove the placeholder endpoint.

### 2. Update `src/components/NewsletterSignup.astro`

Change the fetch call from:
```js
const res = await fetch('/api/loops-subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, referrer: String(data.get('referrer') ?? '') }),
});
```
to a direct Sequenzy POST using urlencoded body:
```js
const res = await fetch('https://api.sequenzy.com/api/v1/forms/s3ean6yt56t58wha6iklj9uo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
  body: new URLSearchParams({ email, referrer: String(data.get('referrer') ?? '') }).toString(),
});
```

Keep the rest of the existing success/error handling intact (the `data-status` toggling, note text, button text).

## Verification

1. `grep -rn "loops-subscribe" src/` → ZERO (endpoint deleted, no references).
2. `grep -rn "s3ean6yt56t58wha6iklj9uo" src/` → present in NewsletterSignup.astro.
3. `npm run build` → succeeds.
4. After deploy: `curl -sS -X POST https://api.sequenzy.com/api/v1/forms/s3ean6yt56t58wha6iklj9uo -H "Content-Type: application/x-www-form-urlencoded" -H "Accept: application/json" -d "email=verify-<ts>@example.com"` → `{"success":true}`.

## Constraints

- Do NOT create any intermediary endpoint — forms POST directly to Sequenzy.
- Do NOT add new files, CSS files, or components.
- Use RELATIVE paths in all edits.
