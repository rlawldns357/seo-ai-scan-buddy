---
name: Social Sharing
description: Score card image sharing to Twitter/LinkedIn/Threads/Kakao with auto-generated 1080x1920 PNG, watermarked, uploaded to og-images bucket for Kakao
type: feature
---

# Social Sharing (Phase 1 + Kakao)

`src/components/ShareButtons.tsx` mounted in `src/pages/Index.tsx` after `ScoreDashboard` and in `/design-test`.

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

## Analytics
All clicks tracked via `trackEvent("share_click", { platform: "kakao"|"twitter"|"linkedin"|"threads"|"copy"|"score_card" })`.
