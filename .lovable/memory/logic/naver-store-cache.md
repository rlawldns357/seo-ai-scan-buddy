---
name: Naver Store 24h Cache
description: 네이버 스토어 분석은 동일 storeUrl 기준 24시간 동안 캐시된 결과 반환 (재현성·어뷰징 방지·API 비용 절감)
type: feature
---

## 정책
- **테이블**: `naver_store_analysis_cache` (url UNIQUE, result_data JSONB, analyzed_at)
- **키**: 정규화된 `storeUrl` (예: `https://brand.naver.com/{slug}`) — IP·세션 무관
- **TTL**: 24시간. HIT 시 `result_data.engineMeta.cache = { hit: true, analyzedAt, ageMinutes, ttlHours: 24 }` 주입 후 반환
- **MISS 시**: 풀 분석 실행 후 upsert(onConflict: url)로 덮어쓰기

## Why
- 결정론적 점수 + 외부 노출 건수 자연 변동 → 사용자 "왜 점수 다르냐" 항의 사전 차단
- 이노비즈 심사 관점 "재현성" 명분 확보
- 네이버 검색 API 호출 5회/분석 절감

## 강제 재분석
- 현재 미제공. 필요 시 admin 전용 query param(`?force=1`) 형태로 추가
