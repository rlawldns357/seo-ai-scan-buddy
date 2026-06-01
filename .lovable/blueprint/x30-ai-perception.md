# ×30 AI 응답 점유율 / AI 인지 카드 — 일시 OFF (블루프린트 보존)

상태: **OFF** (v0.12.0-beta, 2026-06-01)
스위치: `src/lib/featureFlags.ts` → `ENABLE_X30`

## 끈 이유
- `probe-ai-perception` + `measure-answer-share` 한 번 호출에 ChatGPT(gpt-5-nano) × 5콜,
  Claude × 5콜, Gemini × 5콜, Perplexity(sonar) × 5콜, HyperCLOVA × 5콜 → 사용자 1명당 25콜.
- 거기에 ×30 동시 측정 모달까지 누르면 추가로 4엔진 × 30쿼리 = 120콜.
- 메인 토글 default ON 상태에서 토큰/크레딧 소진 속도가 운영 가능 범위를 넘어섬.
- Perplexity 401(키 만료), Lovable AI Gateway 간헐 429 → "측정 실패" UX 노출까지 동반.

## 끈 범위 (코드)
1. `src/pages/Index.tsx`
   - `askAIEnabled` default `false`.
   - "AI에게 직접 물어보기" 토글 버튼: `ENABLE_X30` 가드 + grid `grid-cols-1` 폴백.
   - `<AskAITeaser>` 렌더: `ENABLE_X30` 가드.
   - 결과 페이지 `<AIPerceptionCard>` 2곳(storeContext / 일반): `ENABLE_X30` 가드.
   - `<AnswerShareModal>`은 트리거가 없으므로 자연 비활성.
2. `src/components/AIPerceptionCard.tsx` 의 `×30 AI 응답 점유율 측정` CTA → 부모가 가드되어 도달 불가.
3. `/design-test` 는 디자인 검수용이라 그대로 둠 (실호출 들어가지만 internal-only).

## 살아있는 자산
- 컴포넌트: `AIPerceptionCard.tsx`, `AnswerShareModal.tsx`, `AskAITeaser.tsx`.
- 엣지 함수: `probe-ai-perception`, `measure-answer-share`, `check-indexing(Perplexity)`.
- 디자인 토큰: `gradient-askai`, `x30-cta`, `x30-sheen` (index.css / 컴포넌트 내부).
- 듀얼톤 ×30 CTA 디자인은 그대로 보존 (켤 때 즉시 부활).

## 다시 켤 때 체크리스트
1. `ENABLE_X30 = true`.
2. `PERPLEXITY_API_KEY` 재발급 + secret 업데이트 (현재 401).
3. `probe-ai-perception`의 `Promise.all` → `Promise.allSettled` 패치 (부분 실패 허용).
4. 엔진별 동시 콜 수 축소 (awareness 1콜 + 추천 1콜).
5. `measure-answer-share` 의 `×30` 디폴트 쿼리 수 검토 (10→3 등).
6. `api_cost_log` 일일 예산 알람 임계치 재설정.
7. 메인 default는 `askAIEnabled = false`로 유지, 토글로만 ON 가능하게.

## UX 복원 시 주의
- "AI에게 직접 물어보기" 버튼은 우상단 `×30 New` 그라데이션 뱃지가 정답 (Index.tsx 기존 마크업 그대로).
- 별도 상단 안내 뱃지(통합 라인) 두지 말 것 — 사용자가 명시적으로 거부.
