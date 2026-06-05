
# 블로그 노출 강화 — Plan A (내부 최적화)

`.hermes-exposure-strategy.md`의 우선 보강 대상 6개 글을, 일반 키워드 검색에서 잡히도록 본문/메타/FAQ를 키워드 매칭형으로 재작성하고 IndexNow로 재푸시합니다.

## 대상 6개 글

1. SEO vs AEO vs GEO 차이점 통합 전략 (`seo-vs-aeo-vs-geo`)
2. FAQ 스키마로 AEO 점수 올리는 방법 (`faq-schema-aeo`)
3. AI 크롤러 robots.txt 접근 허용 설정법 (`robots-txt-ai-crawlers`)
4. 네이버 서치어드바이저 완벽 가이드 (`naver-search-advisor-guide`)
5. 카페24 쇼핑몰 SEO 완벽 가이드 (`cafe24-seo-guide`)
6. 아임웹 SEO 최적화 완벽 가이드 (`imweb-seo-guide`)

(slug는 실제 파일 확인 후 정확히 매칭)

## 글마다 적용하는 패턴

각 글에 대해 `.hermes-keyword-map.md`에서 타겟 키워드 3~5개를 뽑아 다음 6곳에 자연스럽게 박습니다.

1. **title** — 검색 의도 키워드를 앞으로
2. **H1** — title과 동일하거나 더 명확한 답변형
3. **첫 문단(80자 이내)** — 키워드 + 한줄 답
4. **H2 3개 이상** — 질문형 키워드 그대로
5. **FAQ 4개 이상** — 역키워드(`.hermes-blog-reverse-keywords.md`) 그대로 질문
6. **내부링크 2개** — 앵커 텍스트를 키워드로

## 발행 후 색인 푸시

- `scripts/generate-sitemap.mjs` 재실행 → lastmod 갱신
- `submit-indexnow` 엣지 함수 호출로 6개 URL을 Bing/Naver/Yandex에 즉시 통보
- 구글은 사이트맵 lastmod 갱신으로 재크롤 트리거

## 검증 (1주일 후)

- `track-serp-keywords` 함수로 6개 글의 타겟 키워드 순위 측정
- `.hermes-exposure-strategy.md`의 "SearchTune 감지=False" 항목들이 True로 바뀌었는지 확인
- 효과 없는 글만 추려서 추가 보강 or Plan B(WP 미러) 검토

## 기술 세부

- 본문 수정: `src/data/blogPosts.ts`의 해당 6개 객체 (title, excerpt, content, faqs)
- 사이트맵: `scripts/generate-sitemap.mjs`는 빌드 후 자동 실행되므로 별도 호출 불필요
- IndexNow: 발행 직후 `supabase.functions.invoke('submit-indexnow', { body: { urls: [...] } })` 1회
- 새 의존성/테이블/시크릿 없음. 비용 0원. 롤백은 git revert 1번

## 작업하지 않는 것

- WordPress.com 미러 (현 무료 플랜에서 canonical 불가, ROI 음수)
- 티스토리 미러 (자동화 API 종료)
- 새 글 작성 (기존 6개 강화에만 집중)
