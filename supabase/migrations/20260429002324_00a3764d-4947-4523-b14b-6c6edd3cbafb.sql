-- ============================================================
-- Performance optimization: targeted indexes + RLS auth.uid() wrapping
-- ============================================================

-- 1) autopublish_settings: cron이 매분 enabled=true 풀 스캔 → partial index
CREATE INDEX IF NOT EXISTS idx_autopublish_enabled
  ON public.autopublish_settings (last_run_at NULLS FIRST)
  WHERE enabled = true;

-- 2) site_posts: 칸반/큐/공개 페이지 핵심 조회
CREATE INDEX IF NOT EXISTS idx_site_posts_site_status
  ON public.site_posts (site_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_posts_published
  ON public.site_posts (published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_site_posts_slug
  ON public.site_posts (site_id, slug);

CREATE INDEX IF NOT EXISTS idx_site_posts_scheduled
  ON public.site_posts (site_id, queue_position)
  WHERE status = 'scheduled';

-- 3) site_products: 사이트별 활성 상품 + 정렬
CREATE INDEX IF NOT EXISTS idx_site_products_site_active
  ON public.site_products (site_id, sort_order)
  WHERE is_active = true;

-- 4) site_post_views: post별 집계 / 세션별 dedupe
CREATE INDEX IF NOT EXISTS idx_site_post_views_post
  ON public.site_post_views (post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_post_views_session
  ON public.site_post_views (post_id, session_id);

-- 5) blog_posts: published 필터가 항상 동반
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_date
  ON public.blog_posts (date DESC)
  WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_blog_posts_featured
  ON public.blog_posts (date DESC)
  WHERE featured = true AND published = true;

-- 6) analytics_events: session_id 조회 가속
CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON public.analytics_events (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

-- 7) user_sites: user_id로 조회 (RLS 핵심 경로)
CREATE INDEX IF NOT EXISTS idx_user_sites_user
  ON public.user_sites (user_id);

CREATE INDEX IF NOT EXISTS idx_user_sites_slug
  ON public.user_sites (site_slug);

-- 8) user_roles: has_role()/get_user_tier() 핫 패스
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles (user_id, role);

-- 9) subscriptions: user별 활성 구독 조회
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON public.subscriptions (user_id, status)
  WHERE status IN ('active','trialing','past_due');

-- 10) email_send_log: 최신 조회 + recipient 필터
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient
  ON public.email_send_log (recipient_email, created_at DESC);

-- 11) consultation_requests: 어드민 최신순 조회
CREATE INDEX IF NOT EXISTS idx_consultation_requests_created
  ON public.consultation_requests (created_at DESC);

-- 12) regeneration_log: 사용자별/일별 집계
CREATE INDEX IF NOT EXISTS idx_regeneration_log_user_date
  ON public.regeneration_log (user_id, created_at DESC);

-- 13) analysis_history: url+date는 있음. 최신 전체 조회 보강
CREATE INDEX IF NOT EXISTS idx_analysis_history_created
  ON public.analysis_history (created_at DESC);

-- ============================================================
-- RLS 정책 최적화: auth.uid()를 (SELECT auth.uid())로 래핑
-- → InitPlan으로 한 번만 평가, 행 단위 재평가 방지
-- ============================================================

-- user_sites
DROP POLICY IF EXISTS "Users can insert own site" ON public.user_sites;
CREATE POLICY "Users can insert own site" ON public.user_sites
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND owner_email IS NOT NULL
    AND char_length(site_slug) BETWEEN 3 AND 50
    AND site_slug ~ '^[a-z0-9-]+$'
    AND char_length(site_url) BETWEEN 5 AND 2000
    AND char_length(title) BETWEEN 1 AND 200
  );

DROP POLICY IF EXISTS "Users can update own site" ON public.user_sites;
CREATE POLICY "Users can update own site" ON public.user_sites
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own site" ON public.user_sites;
CREATE POLICY "Users can delete own site" ON public.user_sites
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- site_posts (가장 자주 조회됨)
DROP POLICY IF EXISTS "Owners can read own site posts" ON public.site_posts;
CREATE POLICY "Owners can read own site posts" ON public.site_posts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_sites s
    WHERE s.id = site_posts.site_id AND s.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Owners can insert site posts" ON public.site_posts;
CREATE POLICY "Owners can insert site posts" ON public.site_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_posts.site_id AND s.user_id = (SELECT auth.uid()))
    AND char_length(title) BETWEEN 1 AND 300
    AND char_length(content) BETWEEN 1 AND 100000
  );

DROP POLICY IF EXISTS "Owners can update site posts" ON public.site_posts;
CREATE POLICY "Owners can update site posts" ON public.site_posts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_posts.site_id AND s.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_posts.site_id AND s.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owners can delete site posts" ON public.site_posts;
CREATE POLICY "Owners can delete site posts" ON public.site_posts
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_posts.site_id AND s.user_id = (SELECT auth.uid())));

-- site_products
DROP POLICY IF EXISTS "Owners can read own site products" ON public.site_products;
CREATE POLICY "Owners can read own site products" ON public.site_products
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_products.site_id AND s.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owners can insert own site products" ON public.site_products;
CREATE POLICY "Owners can insert own site products" ON public.site_products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_products.site_id AND s.user_id = (SELECT auth.uid()))
    AND public.count_site_products(site_id) < 50
  );

DROP POLICY IF EXISTS "Owners can update own site products" ON public.site_products;
CREATE POLICY "Owners can update own site products" ON public.site_products
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_products.site_id AND s.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_products.site_id AND s.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owners can delete own site products" ON public.site_products;
CREATE POLICY "Owners can delete own site products" ON public.site_products
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_products.site_id AND s.user_id = (SELECT auth.uid())));

-- autopublish_settings
DROP POLICY IF EXISTS "Owners can read own autopublish settings" ON public.autopublish_settings;
CREATE POLICY "Owners can read own autopublish settings" ON public.autopublish_settings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = autopublish_settings.site_id AND s.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owners can insert own autopublish settings" ON public.autopublish_settings;
CREATE POLICY "Owners can insert own autopublish settings" ON public.autopublish_settings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = autopublish_settings.site_id AND s.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Owners can update own autopublish settings" ON public.autopublish_settings;
CREATE POLICY "Owners can update own autopublish settings" ON public.autopublish_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = autopublish_settings.site_id AND s.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = autopublish_settings.site_id AND s.user_id = (SELECT auth.uid())));

-- site_post_views
DROP POLICY IF EXISTS "Owners can read own site post views" ON public.site_post_views;
CREATE POLICY "Owners can read own site post views" ON public.site_post_views
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.site_posts p
    JOIN public.user_sites s ON s.id = p.site_id
    WHERE p.id = site_post_views.post_id AND s.user_id = (SELECT auth.uid())
  ));

-- user_roles, regeneration_credits, regeneration_log, subscriptions
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read own credits" ON public.regeneration_credits;
CREATE POLICY "Users can read own credits" ON public.regeneration_credits
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read own regen log" ON public.regeneration_log;
CREATE POLICY "Users can read own regen log" ON public.regeneration_log
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can read own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 통계 갱신
ANALYZE public.autopublish_settings;
ANALYZE public.site_posts;
ANALYZE public.site_products;
ANALYZE public.site_post_views;
ANALYZE public.blog_posts;
ANALYZE public.user_sites;
ANALYZE public.user_roles;
ANALYZE public.analytics_events;