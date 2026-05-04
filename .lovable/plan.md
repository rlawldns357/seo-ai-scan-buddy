## 결과 화면 개선 3종 세트

ADVoost 진단 리포트에서 가져올 만한 요소 + "AI에게 물어보기" 프롬프트 복사 버튼을 함께 적용해요.

---

### 1. ResultHeader에 "통과 / 주의 / 개선 필요" 카운트 칩 추가

`SemiCircleGauge` 3개 옆에, 각 축의 `subSignals`를 점수 기준으로 분류한 통계 칩을 한 줄로 표시해요.

- 통과 (≥75) — 녹색 점 + 개수
- 주의 (60–74) — 노란색 점 + 개수
- 개선 필요 (<60) — 빨간색 점 + 개수

ScoreDashboard 상단(헤더 카드 아래)에 작은 stat strip 한 줄로 들어가면 한눈에 "총 N개 신호 중 M개가 빨간불"이라는 인상을 줄 수 있어요. ADVoost가 신뢰도를 만든 핵심 요소가 이거예요.

```text
[ ● 8 통과   ● 4 주의   ● 3 개선 필요 ]
```

**구현 위치**: `src/components/ScoreDashboard.tsx` 상단 (3축 카드 그리드 위에 신규 `<SignalSummaryStrip />` 추가). 데이터는 기존 `subSignals`만 집계하면 되므로 추가 분석 비용 없음.

---

### 2. 각 개선 항목에 "AI에게 물어보기" 프롬프트 복사 버튼

`DetailPanel`의 개선 과제 영역(가장 먼저 / 빠른 개선 / 추가) 각 행에 작은 `Copy` 아이콘 버튼을 붙여요. 클릭하면 ChatGPT/Claude에 그대로 붙여넣을 수 있는 프롬프트가 클립보드에 복사돼요.

**프롬프트 템플릿 예시**:
```text
내 사이트({domain})의 {축} 점수를 개선하려고 해.

[현재 상황]
- {축} 점수: {score}점
- 핵심 이슈: {issue}
- 개선 과제: {improvement.label} (예상 +{pointRange})

[요청]
이 개선을 어떻게 적용해야 하는지 단계별로 알려줘.
HTML/코드 예시도 함께 보여주면 좋아.
```

복사 후 토스트 "프롬프트가 복사됐어요. ChatGPT/Claude에 붙여넣으세요" + 1.5초 후 사라짐.

**구현 위치**: `src/components/ScoreDashboard.tsx`의 `ImprovementRow`에 `onCopyPrompt` prop 추가, props로 `axis`, `score`, `domain` 받아 프롬프트 빌드.

**부가**: `DetailPanel` 헤더 우측에도 "이 축 전체 진단 복사" 버튼을 두면 통째로 AI에 넘기기 편해요 (이슈 + 개선 과제 + 점수를 묶은 마크다운).

---

### 3. 결과 화면 추가 개선 제안 (선택)

탐색 중 발견한 다른 개선 후보들이에요. 1·2 적용 후 별도로 결정해 주세요.

- **데스크톱 미리보기 썸네일 활용도 ↑**: 현재 `psi.screenshot`이 120×75 작은 썸네일로만 보여요. ADVoost처럼 헤더 옆에 데스크톱+모바일 2장을 더 크게 보여주면 신뢰도 ↑. (PSI에서 모바일도 함께 받아오는지 확인 필요)
- **"이 축 점수, 무엇과 비교할까?" 업계 평균 라인**: SemiCircleGauge 위에 점선으로 평균 50점 마커. 자기 점수가 평균 대비 어디쯤인지 직관적.
- **개선 항목 체크박스 (로컬 진행률)**: 사용자가 "이거 했음" 체크하면 헤더에 진행률 바. localStorage에 저장. 재방문 동기 부여.

---

### 변경 파일 (1·2만 적용 시)

- `src/components/ScoreDashboard.tsx` — SignalSummaryStrip 추가, ImprovementRow에 복사 버튼 추가
- `src/lib/promptBuilder.ts` (신규) — 프롬프트 템플릿 함수
- 토스트는 기존 `useToast` 재사용

작업량: 약 30–40분.

---

### 기술 메모

- `SignalSummaryStrip`은 props로 `result: DemoResult`만 받고 내부에서 9개 신호(3축 × 평균 3개) 집계.
- `disabledMode`(네이버 스토어 케이스)에서는 strip 숨김.
- 프롬프트 복사는 `navigator.clipboard.writeText` + `useToast` (기존 패턴).
- 분석 이벤트: `trackEvent("copy_prompt", { axis, fix_type })` 추가해 어떤 항목이 복사되는지 추적.

---

질문: **3번 추가 개선 항목 중 함께 적용하고 싶은 거 있어요?** 없으면 1·2만 바로 진행할게요.
