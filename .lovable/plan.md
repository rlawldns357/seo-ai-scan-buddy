## 최종 구조: 9탭 → 6탭

```text
현재 9탭                              →  새 6탭
───────────────────────────────────────────────────────────
1. 인사이트         (Admin.tsx)          📊 인사이트
2. 블로그 관리      (Admin.tsx 안)       📝 블로그(자체)      — blog_posts 126
3. SEO 모니터       (SeoMonitor.tsx)     🌱 콘텐츠(AutoBlog)  — site_posts 33
4. SEO Ops Center   (SeoOps.tsx)         🔍 SEO              — 모니터+Ops+색인+액션
5. 색인 큐          (IndexingQueue.tsx)  💰 비용/크레딧       — api_cost_log
6. QA Status        (QaStatus.tsx)       🩺 시스템           — QA+Ops Readonly
7. AI 성장 루프     (AiGrowthLoop.tsx)
8. Threads 발행     (Threads.tsx 1143줄)
9. 크레딧/비용
```

## 6탭 상세

### 📊 인사이트 — `/admin/insights`
- Admin.tsx에서 인사이트 부분만 분리 → `Insights.tsx` (신규)
- 방문/퍼널 KPI (이번에 정확도 개선한 것), 리드, 분석 사용량

### 📝 블로그(자체) — `/admin/blog`
- Admin.tsx에서 블로그 관리 부분만 분리 → `BlogManager.tsx` (신규)
- blog_posts 126개 (SearchTune OS 자체 블로그), 발행/예약/초안

### 🌱 콘텐츠(AutoBlog) — `/admin/content` (신규 탭)
- site_posts 33개 — AutoBlog 호스팅 페이지(/sites/{slug}) 재고/칸반
- 콘텐츠 점수 (SEO/AEO/GEO 3축, content_scoring CRD)
- Threads/소셜 발행 — Threads.tsx에서 핵심만 흡수 (1143줄 → 컴팩트 탭)
- 자동 발행 컨트롤 (autopublish_settings)

### 🔍 SEO — `/admin/seo`
- SeoMonitor.tsx (serp_keywords 122 / serp_tracking_results 4.5k) 그대로
- SeoOps.tsx 핵심을 서브탭으로 흡수
- IndexingQueue.tsx → 서브탭 (1건이라 별도 메뉴 불필요)
- seo_actions (0건이지만 자동 적재용 빈 컨테이너 유지)

### 💰 비용/크레딧 — `/admin/credits`
- Credits.tsx 그대로 (api_cost_log 7d 24k, CostDashboard)

### 🩺 시스템 — `/admin/system`
- QaStatus.tsx + OpsReadonly.tsx 묶기
- 엔진 버전, 자동 업데이트 로그(engine_update_log), QA JSON

## 작업 단계 (실행 순서)

1. **신규 분리**
   - `src/pages/admin/Insights.tsx` ← Admin.tsx 인사이트 섹션 이동
   - `src/pages/admin/BlogManager.tsx` ← Admin.tsx 블로그 섹션 이동
   - `src/pages/admin/Content.tsx` (신규) ← site_posts 재고/칸반/점수/Threads 서브탭

2. **흡수 후 메뉴 삭제**
   - SeoOps.tsx → SEO 탭 서브탭 컴포넌트로
   - IndexingQueue.tsx → SEO 탭 서브탭으로
   - AiGrowthLoop.tsx → **삭제** (0건, SEO 액션 자동 적재 영역만 SEO 탭에 남김)
   - Threads.tsx → 핵심만 Content 탭 서브탭으로 흡수 (학습/설정/대화는 정리)
   - QaStatus.tsx + OpsReadonly.tsx → System 탭 서브탭

3. **AdminLayout 네비 6항목으로 교체**, `App.tsx` 라우트 정리(레거시 경로는 새 경로로 redirect)

4. **삭제 파일**: `AiGrowthLoop.tsx`, `IndexingQueue.tsx`(흡수), `SeoOps.tsx`(흡수), `Threads.tsx`(흡수 후 슬림화)

## 이번 턴 우선 범위 제안

전부 한 번에 치면 큰 PR이라, **1단계만 먼저** 가는 걸 추천:
- AdminLayout 네비를 6탭으로 정리 (라우트 redirect 포함)
- `Content.tsx` 빈 골격 + site_posts 재고 표만 먼저 표시
- Admin.tsx 분리는 다음 턴

진행해도 될지, 아니면 한 번에 전부 칠지 알려주세요.