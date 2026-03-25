

## URL 검증 강화 + 하위 페이지 처리 구현

### 하위 페이지 처리 방식 설명

사용자가 `https://example.com/blog/post-1` 같은 하위 페이지를 입력하면:
- **배너가 나타나서 선택지를 제공**합니다
- "메인 페이지 분석하기" → URL을 `https://example.com`으로 자동 변경 후 분석
- "이 페이지 분석하기" → 입력한 하위 페이지를 그대로 분석
- SEO/AEO/GEO 분석은 보통 메인 페이지 기준이 더 정확하므로 메인을 추천하되, 강제하지 않음

### 구현 계획

**1. `src/lib/urlValidation.ts` 생성**
- `validateUrl(input)` 함수: 아래 검증 수행 후 결과 객체 반환
  - 빈 값 → 에러
  - `https://` 자동 추가 (기존 로직 이관)
  - `ftp://`, `file://` 등 비지원 스킴 → 에러
  - `localhost`, `127.0.0.1`, `192.168.*` 등 내부 주소 → 에러
  - `.pdf`, `.jpg`, `.png`, `.zip` 등 파일 직링크 → 에러
  - `new URL()` 파싱 실패 → 에러
  - pathname이 `/` 가 아닌 경우 → `isSubpage: true` + `rootUrl` 제공
- 반환: `{ isValid, finalUrl, isSubpage, rootUrl, errorMessage? }`

**2. `src/components/SubpageWarning.tsx` 생성**
- 인라인 배너 컴포넌트
- 입력된 URL과 메인 도메인 표시
- "메인 페이지 분석하기" / "이 페이지 그대로 분석하기" 두 버튼

**3. `src/pages/Index.tsx` 수정**
- `handleAnalyze`의 기존 검증 로직을 `validateUrl()` 호출로 교체
- 하위 페이지 감지 시 `showSubpageWarning` 상태로 배너 표시
- 배너에서 선택 시 해당 URL로 `runAnalysis` 호출

