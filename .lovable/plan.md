

# 네이버 OpenAPI 검색 연동 계획

## 개요
`check-indexing` Edge Function에 네이버 검색 API(웹문서 검색)를 추가하여, 도메인명으로 검색했을 때 결과가 나오는지 자동으로 확인합니다. `site:` 연산자는 지원되지 않으므로 도메인명 자체를 키워드로 검색하고, 결과 중 해당 도메인의 URL이 포함되어 있는지를 간접적으로 판단합니다.

## 사전 준비 (사용자 액션 필요)

네이버 OpenAPI 사용을 위해 **NAVER_CLIENT_ID**와 **NAVER_CLIENT_SECRET** 2개의 시크릿이 필요합니다.

발급 방법:
1. [네이버 개발자센터](https://developers.naver.com/apps/) 접속
2. 애플리케이션 등록 → **검색 API** 선택
3. 발급된 Client ID와 Client Secret을 Lovable에 등록

## 변경 사항

### 1. Edge Function 수정 (`supabase/functions/check-indexing/index.ts`)
- 네이버 검색 API 호출 추가 (Google 검색과 병렬 실행)
- 엔드포인트: `https://openapi.naver.com/v1/search/webkr.json?query={domain}&display=5`
- 헤더: `X-Naver-Client-Id`, `X-Naver-Client-Secret`
- 결과에서 해당 도메인 URL 포함 여부를 판단하여 `domainFound`, `resultCount`, `topResults` 반환
- 네이버 API 키가 없는 경우에도 기존 수동 확인 링크를 fallback으로 유지

### 2. 타입 업데이트 (`src/lib/checkIndexing.ts`)
```text
naver: {
  checkUrl: string;
  domainFound: boolean;     // 추가
  resultCount: number;      // 추가
  topResults: { title: string; url: string }[];  // 추가
}
```

### 3. UI 업데이트 (`src/components/IndexingStatus.tsx`)
- 네이버 섹션을 Google과 동일한 패턴으로 변경:
  - 자동 결과가 있으면: "노출 중" / "미노출" 배지 표시
  - `topResults` 목록 표시
  - 여전히 "직접 확인" 링크도 유지
- 네이버 API 미설정 시 기존 "수동 확인" UI 유지 (graceful fallback)

## 응답 구조 변경

```text
{
  success: true,
  google: { ... },           // 기존과 동일
  naver: {
    checkUrl: "...",          // 기존 유지
    domainFound: true,        // 신규: 도메인이 결과에 포함됨
    resultCount: 3,           // 신규: 매칭된 결과 수
    topResults: [             // 신규: 상위 결과
      { title: "...", url: "..." }
    ]
  }
}
```

## 기술 참고
- 네이버 검색 API는 `site:` 연산자를 지원하지 않으므로, 도메인명(예: `searchtuneos.com`)을 키워드로 검색 후 결과 URL에 해당 도메인이 포함되는지 필터링하는 간접 방식
- 정확한 인덱싱 확인이 아닌 "노출 힌트" 수준임을 UI에 표기

