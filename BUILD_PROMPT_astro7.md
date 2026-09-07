# Task: Migrate indianketo from Astro 6 → 7

You are working in the repo at `/home/mike/projects/indianketo` (cwd). This is a static Astro site (32 src files, mdx + sitemap + vercel integrations). Migrate it to Astro 7.

## Steps

1. **Bump dependencies** — run:
   ```
   npm install astro@latest @astrojs/vercel@latest @astrojs/sitemap@latest @astrojs/mdx@latest
   ```
   This updates package.json + package-lock.json and installs new versions into node_modules.

2. **Verify config** — `astro.config.mjs` must have `output: 'static'` (it already does). Confirm it's still `static` after the bump. Do NOT change it.

3. **Sweep for Astro 7 breakages** — run these greps and confirm zero hits (report each):
   ```
   grep -rn 'astro:head' src/
   grep -rn "from ['\"]lucide-react['\"]" src/ | grep -E 'Twitter|Facebook|Linkedin|Instagram|Youtube|Github|Twitch|Dribbble|Figma'
   grep -rnE '</[a-zA-Z][a-zA-Z0-9]*' src/ | grep -v '>$'
   grep -rn '</\w+}' src/
   grep -rn 'output: .hybrid\|output: .server' astro.config.mjs
   ```
   If any hit appears, fix it per the Astro 7 migration rules (see Reference files).

4. **Build** — run `npm run build`. It must complete with `Complete!` and zero `[ERROR]` / `[CompilerError]` lines.

5. **Verify JSON-LD** — after build, check the built output has JSON-LD on a sample page:
   ```
   grep -c 'application/ld+json' dist/index.html
   ```
   Expect ≥1.

## Constraints

- Edit ONLY files needed for the migration (package.json, package-lock.json, and any file that fails a build/grep check). Do NOT touch page content, styles, or layout markup unless a build error forces it.
- Do NOT create new routes or components.
- Do NOT commit or push — leave changes in the working tree.

## Reference files

Astro 7 migration rules (from the astro-7-migration skill):
- `output: 'hybrid'` is REMOVED in Astro 7 — use `output: 'static'` (already the case here).
- `<astro:head>` is REJECTED by the rolldown compiler — replace with `<slot name="head" />` in the layout + `slot="head"` children on pages.
- lucide-react v1.x removed brand icons (Twitter/Facebook/Linkedin/Instagram/Youtube) — inline Simple-Icons SVG, NEVER JSX component definitions in .astro frontmatter.
- Malformed closing tags (`</div` missing `>`, `</div}` stray brace) are rejected — fix them.
- `render(entry)` returns ONLY `{ Content }` — frontmatter data stays on `entry.data`.

## Verification

Report: (1) the new astro version in node_modules (`node -e "console.log(require('astro/package.json').version)"`), (2) the build result, (3) the JSON-LD count, (4) the grep sweep results, (5) the full `git diff --stat` of what you changed.
