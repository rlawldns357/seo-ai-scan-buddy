---
name: Social Sharing
description: Share popover integrated into ResultHeader top-right (Notion/Linear style). 6 channels (Kakao/X/LinkedIn/Threads + Copy/Download) hidden behind single Share2 icon
type: feature
---

# Social Sharing — ResultHeader Popover

All share UI lives **inside `src/components/ResultHeader.tsx`** as a single Share2 icon button at the top-right of the result header card. Click → shadcn `Popover` opens with 4 SNS chips (top row) + Copy/Download buttons (bottom row, separated by divider). No separate section on the page.

## Channels
- **Kakao**: Kakao JS SDK `Share.sendDefault` (feed type) with uploaded image. Requires `VITE_KAKAO_JS_KEY` env. Falls back to text-copy + image-download if SDK/key missing.
- **Twitter/X**: Web Intent (`twitter.com/intent/tweet`) with short text + landing URL.
- **LinkedIn**: `linkedin.com/sharing/share-offsite` (text via OG only).
- **Threads**: `threads.net/intent/post` with full text.
- **Copy text** + **Download PNG** always available.

## Score card image
- 1080x1920 canvas, dark gradient bg, 3 score rings (SEO/AEO/GEO), heavy diagonal "SearchTune OS" watermarks, footer "searchtuneos.com".
- For Kakao: uploaded to `og-images` Supabase bucket (UUID filename, `image/png`, public URL). Cached per-session via `useRef`.
- For download: client-side `URL.createObjectURL(blob)`, filename `searchtune-{domain}.png`.

## Kakao SDK setup
- Loaded via `<script defer>` in `index.html` (kakao.min.js 2.7.4).
- Init lazily on first share click via `ensureKakaoInit()`.
- App key must be added as `VITE_KAKAO_JS_KEY` build env (publishable JS key, domain-restricted in Kakao Developers console).
- Required Kakao Developers config: register Web platform domains (`https://searchtuneos.com`, `https://www.searchtuneos.com`, preview/published Lovable domains).

## UI placement notes
- **Single trigger**: `w-9 h-9 rounded-full bg-muted` Share2 icon at top-right of ResultHeader. No section/card devoted to sharing — keeps results page compact.
- **Popover content**: `w-64 p-3`, `align="end"`, 4-col grid for SNS + 2-col grid for utility actions. Mobile and desktop share the same layout.
- Standalone `ShareButtons.tsx` component is **deleted** — all sharing logic consolidated in ResultHeader.

## Analytics
All clicks tracked via `trackEvent("share_click", { platform: "kakao"|"twitter"|"linkedin"|"threads"|"copy"|"score_card" })`.
