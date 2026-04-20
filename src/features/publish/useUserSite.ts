import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserSite = {
  id: string;
  owner_email: string;
  site_url: string;
  site_slug: string;
  title: string;
  created_at: string;
};

const STORAGE_KEY = "stos_user_site_id";

export function useUserSite() {
  const [site, setSite] = useState<UserSite | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      setSite(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("user_sites").select("*").eq("id", id).maybeSingle();
    setSite((data as UserSite) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const saveSiteId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    refresh();
  };

  const clearSite = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSite(null);
  };

  return { site, loading, refresh, saveSiteId, clearSite };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) || `site-${Date.now().toString(36)}`;
}
