---
name: Inblog FAQ Injection (JSON-LD only)
description: FAQ는 인블로그 미러링 시 본문 삽입 없이 FAQPage JSON-LD만 custom_scripts로 주입. 본문 깔끔 + 인블로그 목차 오염 방지 + 구글 SERP 리치 리절트 유지.
type: feature
---

# Inblog FAQ 처리 규칙 (v2 — JSON-LD only)

## 결정
`publish-to-inblog`는 `blog_posts.faq_short`가 있을 때 **FAQPage JSON-LD**만 `attributes.custom_scripts.json_ld_script`에 주입한다. 본문(content_html)에는 FAQ 섹션을 삽입하지 않는다.

## 왜 본문 삽입을 뺐나
- 인블로그의 자동 좌측 플로팅 목차(H2/H3)에 "자주 묻는 질문"이 잡혀 지저분해짐
- 우리 사이트(searchtuneos.com) 원본 글에도 FAQ 섹션이 이미 렌더링됨 → 미러링 시 중복
- 구글 리치 리절트는 JSON-LD만으로도 발생 (본문 HTML 불필요)

## 트레이드오프 (알고 있어야 함)
- 인블로그 페이지 자체에서는 **독자가 FAQ를 시각적으로 볼 수 없음**
- AI 답변 엔진(Perplexity, ChatGPT SearchGPT)은 본문 텍스트를 우선 인용 → JSON-LD만으로는 인용률이 약간 낮을 수 있음
- 원본(searchtuneos.com) 글에는 FAQ가 그대로 있으므로 AI 인용 소스는 남아있음

## 코드
`supabase/functions/publish-to-inblog/index.ts`
- 조건: `Array.isArray(post.faq_short)` && 각 항목에 q/a(또는 question/answer) 값 존재
- 출력: `attributes.custom_scripts.json_ld_script = JSON.stringify(FAQPage 스키마)`
- 응답의 `faq.mode = "json_ld_only"`로 판별 가능
