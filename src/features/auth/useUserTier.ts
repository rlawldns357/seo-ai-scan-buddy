import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "free" | "beta" | "lite" | "pro" | "studio" | "admin";

const TIER_RANK: Record<AppRole, number> = {
  free: 1,
  beta: 2,
  lite: 3,
  pro: 4,
  studio: 5,
  admin: 6,
};

/** Site limits per tier (BM v7) */
export const SITE_LIMIT: Record<AppRole, number> = {
  free: 1,
  beta: 3,
  lite: 1,
  pro: 3,
  studio: 10,
  admin: 99,
};

/** Product catalog limits per tier. Free/Beta locked, Lite teaser=1, Pro/Studio=50 */
export const PRODUCT_LIMIT: Record<AppRole, number> = {
  free: 0,
  beta: 0,
  lite: 1,
  pro: 50,
  studio: 50,
  admin: 99,
};

/** Returns the user's highest-rank active role. */
export function useUserTier() {
  const { user, loading: authLoading } = useAuth();
  const [tier, setTier] = useState<AppRole>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setTier("free");
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, expires_at")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setTier("free");
      } else {
        const now = Date.now();
        const valid = data.filter(
          (r) => !r.expires_at || new Date(r.expires_at).getTime() > now,
        );
        const highest = valid.reduce<AppRole>((acc, r) => {
          const role = r.role as AppRole;
          return TIER_RANK[role] > TIER_RANK[acc] ? role : acc;
        }, "free");
        setTier(highest);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    tier,
    siteLimit: SITE_LIMIT[tier],
    productLimit: PRODUCT_LIMIT[tier],
    loading: loading || authLoading,
  };
}
