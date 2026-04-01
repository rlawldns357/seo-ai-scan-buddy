

# Admin Insights 데이터 누락 수정 — 1000행 제한 해결

## 문제
`admin-insights` 엣지 함수가 `analytics_events`를 조회할 때 Supabase SDK 기본 제한인 **최대 1000행**만 가져옵니다. 이벤트가 1000개를 넘으면 최신 1000개만 반환되어, 과거 외부 사용자의 분석 기록이 잘립니다. 본인이 많이 테스트하면 본인 데이터로 1000행이 채워져서 다른 사람 기록이 안 보이는 것입니다.

## 수정 내용

### `supabase/functions/admin-insights/index.ts`
- **페이지네이션 헬퍼 추가**: `.range()`를 이용해 1000행씩 반복 조회하여 전체 데이터를 가져오는 `fetchAll` 함수 구현
- `analytics_events`와 `email_leads` 양쪽 모두 적용
- 기존 집계/필터 로직은 그대로 유지

```text
fetchAll(table, sinceStr):
  offset = 0, pageSize = 1000, result = []
  loop:
    query .select("*").gte("created_at", sinceStr)
          .order("created_at", desc)
          .range(offset, offset + 999)
    result.push(...data)
    if data.length < 1000 → break
    offset += 1000
  return result
```

변경 파일: `supabase/functions/admin-insights/index.ts` (1개)

