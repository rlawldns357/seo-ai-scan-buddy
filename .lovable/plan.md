# 인바운드 리드 → 유료 전환 퍼널 재설계

## 이론적 기반 (하이브리드)

**Hormozi $100M Offers**로 "Grand Slam Offer(거절 불가 제안)"를 만들고, **StoryBrand SB7**로 스토리 흐름을 잡고, **Ogilvy Direct Response** 카피 규칙으로 카피를 씁니다. 목적은 명확: **다음 상품(유료 SaaS/컨설팅) 판매**.

### 가치 방정식 (Hormozi)
```text
Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)
       = (AI 검색 노출 확보  × 실제 스코어 진단) / (즉시 결과 × 이메일 1번)
```
→ 무료 진단은 "가치 방정식 분자를 미리 증명"하는 도구. 그 후 유료 제안은 "분모를 대신 해결해 드림"으로 포지셔닝.

### StoryBrand 7단계 매핑
| 단계 | SearchTune OS 적용 |
|---|---|
| 1. 주인공(Hero) | 노출 안 되는 자사 사이트를 가진 대표 |
| 2. 문제 | ChatGPT/Perplexity에 우리 브랜드가 안 나옴 |
| 3. 가이드 | SearchTune OS (진단 근거·데이터) |
| 4. 계획 | ① 무료 진단 ② 맞춤 리포트 ③ 실행 |
| 5. 행동 촉구 | Direct(구매) + Transitional(리포트/상담) |
| 6. 실패 회피 | 2026년 AI 검색 전환에서 뒤처짐 |
| 7. 성공 상상 | 경쟁사보다 먼저 AI가 우리를 인용 |

---

## 5단계 퍼널 구조

```text
[1] Awareness      [2] Lead Magnet   [3] Nurture       [4] Offer         [5] Close
Blog/SEO 유입  →   무료 진단 실행 → 5일 소프오페라 → Tripwire 제안 → 유료/상담 전환
공유·검색           (Hero 사이트)   (스토리+증거)    (저가 진입점)     (다음 상품)
```

### 각 단계 개편안

**[1] Awareness** — 이미 작동 중. 유지.

**[2] Lead Magnet (진입점) — 재설계**
- 현재: `FunnelCTAs`의 "출시 알림 / 상담 / 자동 리포트" 3분할 → 초점 분산
- 신규: **결과 화면 하단에 단일 Grand Slam Offer 카드**
  - 헤드라인: "이 진단 결과를 바탕으로 **맞춤 실행 리포트 PDF**를 받으세요"
  - 4대 스택(Hormozi 규칙): ①맞춤 진단 PDF ②AI 검색 최적화 가이드북 ③30분 무료 전략 상담 ④경쟁사 벤치마크
  - 리스크 리버설: "3분, 이메일만"
  - 서브 CTA: "출시 알림만 받기" (약한 의도용 폴백)

**[3] Nurture (5일 소프오페라) — 재작성**
- 현재: `soap-day-1..5` 이미 발송 로직 있음 → **콘텐츠만 SB7 흐름으로 리라이트**
  - Day 1: 진단 요약 + Dream Outcome (성공 상상)
  - Day 2: 실패 사례 (Loss Aversion, Ogilvy)
  - Day 3: 방법론 공개 (Perceived Likelihood ↑)
  - Day 4: 고객/데이터 증거 (Social Proof)
  - Day 5: **Tripwire 제안** (아래 [4])

**[4] Tripwire Offer (신규)**
- 저가·저저항 진입 상품 1개 도입. 예: "1회 심층 진단 리포트 ₩29,000" 또는 "AI 검색 노출 스타터팩"
- 이메일 Day 5 + 결과 화면 상단 배너에서 노출
- 목표: 무료→유료 첫 결제 마찰 제거 후 상위 상품 업셀

**[5] Close (다음 상품)**
- 상담 완료 리드 자동 태깅
- 어드민 리드 인박스에서 스테이지별 관리 (`new / nurturing / tripwire / closed`)

---

## 어드민 리드 인박스 (신규)

`/admin/insights` 상단에 **Leads 탭** 신설.
- 소스 필터: `funnel_step1`, `consultation`, `contact`, `lead_notify`
- 스테이지 파이프라인 UI (칸반 or 리스트)
- 각 리드: 진단 스코어(SEO/AEO/GEO), UTM, landing_url, 이메일 발송 이력(soap day)
- CSV export
- **새 리드 발생 시 지정 이메일로 즉시 알림** (수신 주소는 어드민 UI에서 편집 가능하도록 `engine_config`에 `lead_notify_emails` 키로 저장 — 여러 개 쉼표 구분)

---

## 기술 구현 (요약)

### DB
- `email_leads` 확장: `stage TEXT DEFAULT 'new'`, `tripwire_purchased_at`, `landing_url`, `utm_*` (없다면 추가)
- `engine_config`에 `lead_notify_emails` 설정 로우 1개

### Edge Functions
- `enrollSoapFunnel` 후속 훅: 서비스에서 관리자 이메일 즉시 발송 (`send-transactional-email` + 신규 템플릿 `admin-new-lead`)
- `dispatch-soap-opera` 콘텐츠만 재작성, 로직 유지
- 신규 어드민 액션 `listLeads`, `updateLeadStage` in `admin-insights`

### UI
- `src/components/FunnelCTAs.tsx` → 단일 Grand Slam Offer 카드로 교체 (기존 3분할은 폴백 링크로 축소)
- `src/pages/admin/Insights.tsx`에 Leads 탭 추가 (`src/components/admin/LeadsInbox.tsx` 신설)
- 어드민 시스템 탭에 "리드 알림 수신 이메일" 설정 카드

### 이메일
- 신규 앱 이메일 템플릿: `admin-new-lead.tsx` (관리자용), `tripwire-offer.tsx` (Day 5용, 기존 `soap-day-5` 대체 또는 리팩터)
- 나머지 `soap-day-1~4` 카피는 SB7 흐름으로 리라이트

---

## 오픈 결정 사항 (진행 전 확답 필요)

1. **Tripwire 상품이 실제로 있는지** — 없으면 "무료 30분 전략 상담"만 Direct CTA로 쓰고 Tripwire 슬롯은 비활성으로 시작
2. **다음 판매 상품(메인 오퍼)의 가격·이름** — 소프오페라 Day 5 카피에 넣어야 함
3. **관리자 알림 수신 이메일** — 아직 미정이라고 하셨으니, 우선 어드민 UI에서 편집 가능하도록 만들어 두고 나중에 값만 입력하시면 됨

이 3개 확답 주시면 바로 구현 시작합니다.
