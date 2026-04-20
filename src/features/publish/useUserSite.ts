import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";

export type UserSite = {
  id: string;
  owner_email: string;
  site_url: string;
  site_slug: string;
  title: string;
  user_id: string | null;
  created_at: string;
};

export function useUserSite() {
  const { user, loading: authLoading } = useAuth();
  const [site, setSite] = useState<UserSite | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSite(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_sites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setSite((data as UserSite) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, refresh]);

  return { site, loading: loading || authLoading, refresh };
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || `site-${Date.now().toString(36)}`
  );
}
