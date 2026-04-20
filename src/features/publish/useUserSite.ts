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

const ACTIVE_SITE_KEY = "stos.activeSiteId";

function getStoredActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SITE_KEY);
  } catch {
    return null;
  }
}

function setStoredActiveId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_SITE_KEY, id);
    else localStorage.removeItem(ACTIVE_SITE_KEY);
  } catch {
    /* noop */
  }
}

/** Returns ALL sites owned by the current user + active site selection. */
export function useUserSites() {
  const { user, loading: authLoading } = useAuth();
  const [sites, setSites] = useState<UserSite[]>([]);
  const [activeSiteId, setActiveSiteIdState] = useState<string | null>(getStoredActiveId());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_sites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    const list = (data as UserSite[]) ?? [];
    setSites(list);

    // Reconcile active site
    const stored = getStoredActiveId();
    const validStored = list.find((s) => s.id === stored);
    if (validStored) {
      setActiveSiteIdState(validStored.id);
    } else if (list[0]) {
      setActiveSiteIdState(list[0].id);
      setStoredActiveId(list[0].id);
    } else {
      setActiveSiteIdState(null);
      setStoredActiveId(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, refresh]);

  const setActiveSiteId = useCallback((id: string) => {
    setActiveSiteIdState(id);
    setStoredActiveId(id);
  }, []);

  const activeSite = sites.find((s) => s.id === activeSiteId) ?? sites[0] ?? null;

  return {
    sites,
    activeSite,
    activeSiteId: activeSite?.id ?? null,
    setActiveSiteId,
    loading: loading || authLoading,
    refresh,
  };
}

/** Backwards-compatible single-site hook. Returns the active site. */
export function useUserSite() {
  const { activeSite, loading, refresh } = useUserSites();
  return { site: activeSite, loading, refresh };
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
