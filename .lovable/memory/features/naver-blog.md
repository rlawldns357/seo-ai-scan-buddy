---
name: Naver Blog Integration
description: 네이버 블로그 연동 — 1+2+3 패키지(SmartEditor ONE 호환 복사 + 네이버 SEO 점수 + 발행 트래킹). Coming Soon 티저 → 정식 출시 단계. 자동 발행은 비공식이라 안 함. 상세는 CRD 참조.
type: feature
---

# Naver Blog Integration

**상태**: 📌 보류 (다음 스프린트에 Coming Soon 티저, AutoBlog 1.0 안정화 후 정식 출시)
**상세 기획**: `.lovable/crd/naver-blog-integration.md`

## 핵심 결정사항 (변경 금지)

1. **자동 발행은 안 함** — 네이버 공식 글쓰기 API는 2017년 종료. 비공식 자동화는 ToS 위반 + 계정 차단 위험. **Pillar는 "수동 붙여넣기를 완벽하게"** 로 한정.
2. **3 Pillar 풀패키지**:
   - **Pillar 1**: SmartEditor ONE 호환 HTML 클립보드 복사 ("네이버용 복사" 버튼)
   - **Pillar 2**: 네이버 적합도 점수 + 체크리스트 (첫 100자 키워드, 본문 1500자+, 이미지 3장+, H2/H3, 외부 링크 ≤3, 해시태그 30개)
   - **Pillar 3**: 발행 후 트래킹 (`naver_url` 입력 → 주간 cron으로 일치도 검증)
3. **Stage 0 = Coming Soon 티저** — 대시보드 사이드바 "Naver" 탭(자물쇠+Soon 배지) → `/dashboard/naver` 랜딩 → "관심있어요" 버튼으로 `naver_interest` 테이블 수집. 카운터("N명 기다리는 중") 표시.
4. **출시 트리거**: 베타 유저 30%+ 관심 등록 시 Pillar 1 MVP 착수.

## 구현 시 주의

- 변환은 **클라이언트 사이드** (DOMParser + 규칙 기반). 서버 비용 0.
- 이미지는 Storage URL 그대로 사용 (네이버 외부 이미지 hot-link 허용). base64 인라인 금지(에디터가 거부).
- `<a>`는 `target="_blank" rel="nofollow"`.
- Pillar 2 개선 제안은 Lovable AI gemini-2.5-flash 사용.
- Stage 4(자동 발행) 절대 시도 금지. 사용자가 요청해도 ToS 사유로 거절.

## 워딩 규칙

- "네이버 자동 발행" ❌ → "**네이버용 복사**" ⭕
- "네이버 봇이 알아서" ❌ → "에디터에 한 번에 붙여넣기" ⭕
- Coming Soon은 "**곧 출시**"로 표기 (영문/한글 혼용 금지).
