---
name: ASCII-Only Blog Slugs
description: 모든 자동 생성 블로그 글의 URL slug는 ASCII 영문만. 한글 슬러그 절대 금지 (네이버 색인 실패 방지)
type: constraint
---

# 블로그 Slug ASCII-only 규칙

## 왜
- **네이버**: 한글 URL을 percent-encoding으로 처리 → 색인 누락, 다른 페이지로 인식, 사이트맵 검증 실패
- **공유성**: 카카오톡/페북/트위터에서 한글 URL 미리보기 깨짐
- **AEO/GEO**: AI 봇이 URL 파싱 시 한글 토큰을 noise로 처리

## 어디에 적용
- `generate-blog-post`: AI tool schema에 `slug_en` 필드 추가, `buildSafeSlug()`로 검증
- `generate-content-draft`: `slug` 필드 description에 영문 강제 명시

## 폴백 우선순위 (`buildSafeSlug`)
1. AI가 준 `slug_en` 검증 → 토큰 ≥2개 → 사용
2. 제목에서 ASCII 토큰 추출 → ≥2개 → 사용
3. 최종 폴백: `post-{YYYYMMDD}-{6자해시}`

## 절대 금지
- `[^a-z0-9가-힣]` 같은 한글 허용 정규식 (이전 코드)
- 한글→로마자 음역 (의미 손실, 가독성 ↓)

## 트레이드오프 인정
- 구글 한글 키워드 URL 매칭 보너스는 포기
- 대신 제목·본문·H2·메타에 한글 키워드 강화로 보완
- 네이버 가산점 + 공유성 + AI 파싱 안정성 우선

## 기존 한글 슬러그 글
- 그대로 둠 (백링크 깨짐 방지)
- 신규 글부터 영문 slug 적용
