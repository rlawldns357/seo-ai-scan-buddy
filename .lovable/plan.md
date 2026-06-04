# 정합성 시스템 풀패키지 (Identity SoT + Match Util + Audit & Voter)

## 목표
"이 사이트가 뭐냐(brand · aliases · category · 한 줄 설명)" 판단을 **단 한 곳**에서 권위적으로 결정하고, 모든 함수가 이를 공유. 정합성 의심 케이스는 **자동 2차 검증**, 모든 판정은 **추적 가능**.

## 구조
```text
┌─────────────────────────────────────────┐
│ resolve-site-identity (신규 edge fn)     │
│  ├─ 7d 캐시 hit → 즉시 반환              │
│  └─ miss → Firecrawl + Gemini 1차        │
│       → confidence<0.7면 GPT 2차 합의    │
│       → site_identity 저장 + audit log   │
└────────────────┬────────────────────────┘
                 │ identity { brand, aliases, category, description, confidence }
   ┌─────────────┼─────────────┬──────────────┐
   ▼             ▼             ▼              ▼
analyze-site  probe-ai     generate-blog   admin viewer
              perception   post            (audit log)
   (모두 _shared/identity-match.ts 유틸 사용)
```

## 1. DB 마이그레이션
신규 테이블 2개:
- `site_identity` — host(PK), brand, aliases[], category, description_short, confidence(0~1), source(`page_signal`|`llm_gate`|`cross_llm_vote`|`cache`), refreshed_at, expires_at(now+7d)
- `identity_audit_log` — host, stage(`resolve`|`gate`|`probe_match`), before jsonb, after jsonb, confidence, reason, source, created_at
- 둘 다 service_role ALL, authenticated/admin SELECT, public 접근 차단
- GRANT 명시

## 2. `_shared/identity-match.ts` (신규)
현재 probe/analyze에 흩어진 매칭 로직을 한 곳으로:
- `squash(s)`, `meaningfulCategoryTokens(category)` — 기존 로직 이관
- `brandMentioned(text, identity) → "strict"|"fuzzy"|"semantic"|"none"` — 도메인·brand·aliases 매칭
- `categoryMatches(text, identity) → number (0~1)` — 의미 토큰 일치율
- `describesSameEntity(text, identity) → { match: boolean, confidence, reason }` — 종합
- `loadIdentity(supabase, host)` / `upsertIdentity(...)` / `logAudit(...)` 헬퍼

## 3. `supabase/functions/resolve-site-identity/index.ts` (신규)
- 입력: `{ url, force?: boolean }`
- 흐름: 캐시(7d) → Firecrawl(main+about, markdown+summary) → Gemini 구조화 추출 → confidence 계산(신호 풍부도) → 0.7 미만이면 GPT-5-mini 2차 호출 후 합의 → 저장 + audit
- 합의 룰: 두 모델의 brand·category가 의미적으로 일치(`describesSameEntity`)하면 confidence=0.9, 불일치면 page_signal 강한 쪽 채택 후 confidence=0.6
- 모든 단계 cost-logger 계측

## 4. 기존 함수 리팩토링
- **analyze-site**: 시작점에서 `resolve-site-identity` 호출 → 결과를 prompt에 주입 → 기존 `verifyConsistency` 게이트 제거(이미 resolve가 처리)
- **probe-ai-perception**: `loadIdentity(host)`로 brand/aliases/category 조회 → 기존 `verifyCategoryFromPage` 제거 → `detectAwareness`/`detectRecommendation`를 `_shared/identity-match.ts`의 `brandMentioned`+`categoryMatches` 호출로 교체 → probe 매칭 결과도 `logAudit(stage='probe_match')` 기록
- 다른 함수(generate-blog-post 등)는 본 패키지 범위 밖 — 후속 PR

## 5. 어드민 audit 뷰어
- `src/pages/admin/IdentityAudit.tsx` — 최근 50개 audit 로그 테이블 (host, stage, before/after diff, confidence, reason)
- 사이드바 메뉴 추가
- admin-insights 엣지 함수에 `action: "identity_audit"` 추가

## 비용·성능
- 첫 분석: +Firecrawl 1회(이미 있음), +Gemini 1회, (저신뢰시) +GPT 1회 → 분석당 ₩30~80 추가
- 재분석(7일 내): **분석당 ₩0~5 절약** (analyze/probe/blog가 중복으로 brand/category 추론하던 거 제거)
- 첫 분석 latency: +1~2초 (resolve 호출), 캐시 hit은 -2초

## 변경 파일
신규:
- `supabase/migrations/<timestamp>_identity_sot.sql`
- `supabase/functions/_shared/identity-match.ts`
- `supabase/functions/resolve-site-identity/index.ts`
- `src/pages/admin/IdentityAudit.tsx`

수정:
- `supabase/functions/analyze-site/index.ts`
- `supabase/functions/probe-ai-perception/index.ts`
- `supabase/functions/admin-insights/index.ts`
- `src/pages/admin/AdminLayout.tsx` (메뉴 추가)
- `src/App.tsx` (라우트 추가)

## 회귀 보호
- analyze-site는 resolve 실패 시 기존 추출 경로로 폴백 (graceful)
- probe-ai-perception은 loadIdentity 실패 시 기존 URL 기반 brand 추출 폴백
- 캐시 stale 시 백그라운드 refresh, 응답은 stale-while-revalidate

## 진행 순서
1. 마이그레이션 (테이블 2개)
2. `_shared/identity-match.ts` 작성
3. `resolve-site-identity` 함수 작성
4. analyze-site / probe-ai-perception 리팩토링
5. 어드민 뷰어 추가
6. evabin URL로 end-to-end 검증 (Edge logs + DB 확인)

## 후속 (이번 패키지 밖)
- generate-blog-post / scoring 함수도 동일 패턴으로 이관
- audit confidence 트렌드 차트
- "이 사이트 정체 수동 보정" 어드민 폼
