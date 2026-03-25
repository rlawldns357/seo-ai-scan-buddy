

## Lighthouse 건너뛰기 기능

### 변경 사항

**1. Index.tsx — 빠른 분석 토글 + 분석 로직 분기**
- `skipLighthouse` state 추가
- 입력창 아래에 "⚡ 빠른 분석 (Lighthouse 건너뛰기)" 체크박스/토글 추가 — 작고 깔끔하게
- `runAnalysis`에서 `skipLighthouse`가 true이면 PSI 호출을 건너뛰고 crawling + AI 분석만 실행
- 결과 화면으로 넘어갈 때 `skipLighthouse` 상태를 유지

**2. Index.tsx — 결과 화면에 "Lighthouse 측정 추가" 버튼**
- Lighthouse 데이터가 없을 때 (건너뛴 경우) LighthouseScores 자리에 "Lighthouse 측정 추가" 버튼 카드 표시
- 클릭 시 `fetchPsi` 호출하여 mobile/desktop 데이터 로딩 → 완료되면 기존 LighthouseScores 컴포넌트로 교체
- 로딩 중 상태 표시 (스피너)

**3. LoadingScreen.tsx — 빠른 분석 모드 대응**
- `skipLighthouse` prop 추가
- true일 경우 "Lighthouse 측정 중…" 단계를 표시하지 않음 (2단계만 표시)
- 진행률 계산도 2단계 기준으로 조정

### 기술 상세

```text
Index.tsx state 추가:
  skipLighthouse: boolean (default false)
  psiLoading: boolean (나중에 측정 버튼용)

runAnalysis 분기:
  if skipLighthouse → psiPromise = Promise.resolve([{data:null}, {data:null}])
  else → 기존 로직

결과 화면:
  !psiMobile && !psiDesktop && !psiError
    → "Lighthouse 성능 측정" 버튼 카드 렌더
    → 클릭 시 psiLoading=true, fetchPsi 실행, 완료 시 setPsi + psiLoading=false
```

