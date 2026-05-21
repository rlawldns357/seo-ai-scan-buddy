# SearchTune OS Growth Loop 현황 — 2026-05-21 09:12 KST

## 결론

- 운영 API/중간 보드 데이터는 갱신 중이다. `ops-readonly`는 HTTP 200이고 `generated_at=2026-05-20T23:50:59Z` 기준으로 응답했다.
- 핵심 문제는 데이터 수집 정지보다 **AI Growth Loop 기록이 0건**이라는 점이다. 즉, 점검 결과가 블로그 수정/색인 요청/성과 모니터링 액션으로 연결되어 DB에 남는 루프가 아직 없다.
- live sitemap 기준 블로그 URL은 101개다. 샘플 25개 HTML 점검에서는 HTTP 200, canonical, title, description, H1이 정상이다.
- static repo corpus `src/data/blogPosts.ts`는 14개만 포함한다. live 101개와 정적 파일 14개 사이에 데이터 출처 차이가 있으므로, 성장 루프는 **Supabase DB + sitemap + repo static corpus**를 함께 봐야 한다.
- clean URL `/blog/{slug}`가 `.html` canonical로 redirect되지 않는 이슈는 남아 있다. sitemap/canonical은 `.html`이므로, 운영 정책은 `.html` 중심으로 통일하되 clean URL fallback은 known risk로 추적한다.

## 현재 운영 API 요약

```json
{
  "opsScore": { "overall": 62, "seoMonitor": 58, "indexingQueue": 100, "aiGrowthLoop": 30 },
  "risks": ["미노출 키워드 23개", "최근 AI 액션 기록 없음"],
  "todayTasks": 1,
  "seoMonitor": {
    "total_keywords": 30,
    "exposed_keywords": 3,
    "partial_keywords": 4,
    "missing_keywords": 23,
    "last_serp_run": "2026-05-20T21:01:25.595241+00:00"
  },
  "indexingQueue": {
    "total": 1,
    "requested": 1,
    "recent": "https://searchtuneos.com/blog/what-is-aeo.html"
  },
  "aiGrowthLoop": { "total": 0, "recent": [] }
}
```

## live site/sitemap 확인

- `/` HTTP 200
- `/admin/seo-ops` HTTP 200, 인증 화면 노출
- `/sitemap.xml` HTTP 200, sitemap index 2개
- `/sitemap-posts.xml` HTTP 200, URL 101개
- `/sitemap-pages.xml` HTTP 200, URL 4개
- 샘플 25개 블로그 URL: HTTP 200 / canonical 일치 / description 70자 이상 / H1 존재

샘플 결과 파일: `reports/live-sitemap-audit-sample.json`

## repo/브랜치 상태

- 새 작업 브랜치: `seo/growth-loop-engine-20260521`
- 기존 로컬 변경이 이미 존재함:
  - `public/sitemap-pages.xml`
  - `public/sitemap-posts.xml`
  - `public/sitemap.xml`
  - `scripts/generate-sitemap.mjs`
  - 다수의 `.cron`, `.watch`, `cdp_*.cjs/js` 운영 파일
- 이번 작업에서 새로 추가한 파일:
  - `scripts/audit-blog-growth-loop.mjs`
  - `reports/blog-growth-loop-audit.json`
  - `reports/live-sitemap-audit-sample.json`
  - `docs/searchtune-growth-loop/*`

## static corpus 감사 결과

`node scripts/audit-blog-growth-loop.mjs` 실행 결과:

- static corpus: 14개
- severity: medium 13개, low 1개
- 공통 패턴:
  - authority link 없음: 14개
  - TL;DR 없음: 14개
  - 내부링크 2개 미만: 13개
  - excerpt 길이 재검토: 8개
- 우선 후보:
  - `what-is-aeo`
  - `seo-vs-aeo-vs-geo`
  - `faq-schema-aeo-boost`
  - `ai-crawler-access`
  - `naver-search-advisor-guide`
  - `cafe24-seo-guide`

## 운영 판단

1. 지금 당장 필요한 것은 “더 많은 보고”가 아니라 **액션 로그 테이블/상태 머신**이다.
2. 블로그 최적화는 대량 관리가 가능하지만, 수정은 배치 단위로 제한해야 한다.
3. 첫 번째 배치는 AEO cluster 중심으로 작게 시작한다.
4. Lovable에는 DB/보드/읽기전용 API 구조를 요청하고, Hermes/Git에서는 감사 스크립트와 콘텐츠 수정 브랜치를 운영한다.
