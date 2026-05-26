-- Drop the broad public SELECT policy that exposed owner_email
DROP POLICY IF EXISTS "Public can read user sites" ON public.user_sites;

-- Defensive: revoke any direct grants to anon/authenticated on the table and column
REVOKE SELECT ON public.user_sites FROM anon, authenticated, public;
REVOKE SELECT (owner_email) ON public.user_sites FROM anon, authenticated, public;

-- Re-grant table-level SELECT to authenticated so RLS owner policy works
GRANT SELECT (id, site_slug, site_url, title, user_id, created_at, updated_at) ON public.user_sites TO authenticated;

-- Owners can read their own sites
CREATE POLICY "Owners can read own user_sites"
ON public.user_sites
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);