# Batch A — AEO Cluster Action Queue

Generated: 2026-05-21 KST

## Status

- Branch: `seo/growth-loop-engine-20260521`
- Audit script: `scripts/audit-blog-growth-loop.mjs`
- Build verification after first edit: `npm run build` ✅

## Actions

### A-001 — `what-is-aeo`

- canonical: `https://searchtuneos.com/blog/what-is-aeo.html`
- target keyword: `AEO란`
- status: `edited_in_git`
- priority: `P1`
- reason: Google indexing queue has this URL as requested, broad acquisition keyword visibility is weak, and static audit showed missing TL;DR / authority links / internal links.
- changes applied:
  - Added TL;DR block at top.
  - Added official authority links: Schema.org FAQPage, Google Search Central structured data intro.
  - Added internal canonical `.html` links to `seo-vs-aeo-vs-geo`, `faq-schema-aeo-boost`, `ai-crawler-access`.
- verification:
  - `node scripts/audit-blog-growth-loop.mjs`: `what-is-aeo` moved from `medium` to `ok` in static audit.
  - `npm run build`: pass.
- next state:
  - after deploy: `deployed`
  - after Google/Naver manual request: `index_requested`
  - after SERP watch: `monitoring → improved/no_change/worse`

### A-002 — `seo-vs-aeo-vs-geo`

- canonical: `https://searchtuneos.com/blog/seo-vs-aeo-vs-geo.html`
- target keyword: `SEO AEO GEO 차이`
- status: `planned`
- priority: `P1`
- recommended changes:
  - Add TL;DR block.
  - Add official source links to Google Search Central / Schema.org where natural.
  - Add comparison interaction candidate: `comparison_toggle` with static table fallback.
  - Track clean URL fallback risk separately.

### A-003 — `faq-schema-aeo-boost`

- canonical: `https://searchtuneos.com/blog/faq-schema-aeo-boost.html`
- target keyword: `FAQ 스키마 AEO`
- status: `planned`
- priority: `P2`
- recommended changes:
  - Add Schema.org / Google official links.
  - Add internal links to `what-is-aeo.html`, `structured-data-guide.html`, `seo-vs-aeo-vs-geo.html`.
  - Add checklist interaction candidate.

## Batch guardrail

Do not expand this pattern to all 101 URLs until A-001/A-002/A-003 are deployed and monitored.
