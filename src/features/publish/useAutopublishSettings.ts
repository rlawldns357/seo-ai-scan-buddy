import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AutopublishSettings = {
  site_id: string;
  enabled: boolean;
  weekdays: number[]; // 0=Sun .. 6=Sat
  hours_kst: number[]; // 0..23
  daily_limit: number;
  auto_topup: boolean;
  min_queue: number;
  last_run_at: string | null;
};

const DEFAULTS: Omit<AutopublishSettings, "site_id"> = {
  enabled: false,
  weekdays: [1, 2, 3, 4, 5],
  hours_kst: [9],
  daily_limit: 1,
  auto_topup: true,
  min_queue: 5,
  last_run_at: null,
};

/**
 * Loads + persists per-site autopublish settings. Auto-creates a row on first save.
 */
export function useAutopublishSettings(siteId: string | null | undefined) {
  const [settings, setSettings] = useState<AutopublishSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("autopublish_settings" as any)
      .select("*")
      .eq("site_id", siteId)
      .maybeSingle();
    setSettings(
      data
        ? (data as unknown as AutopublishSettings)
        : { site_id: siteId, ...DEFAULTS },
    );
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (patch: Partial<AutopublishSettings>) => {
      if (!siteId) return;
      setSaving(true);
      const next: AutopublishSettings = {
        ...(settings ?? { site_id: siteId, ...DEFAULTS }),
        ...patch,
        site_id: siteId,
      };
      // Sanitize
      next.weekdays = Array.from(new Set(next.weekdays)).filter((d) => d >= 0 && d <= 6).sort();
      next.hours_kst = Array.from(new Set(next.hours_kst)).filter((h) => h >= 0 && h <= 23).sort((a, b) => a - b);
      if (next.weekdays.length === 0) next.weekdays = [1, 2, 3, 4, 5];
      if (next.hours_kst.length === 0) next.hours_kst = [9];
      next.daily_limit = Math.min(Math.max(next.daily_limit, 1), 10);
      next.min_queue = Math.min(Math.max(next.min_queue, 0), 50);

      const { error } = await supabase
        .from("autopublish_settings" as any)
        .upsert(
          {
            site_id: next.site_id,
            enabled: next.enabled,
            weekdays: next.weekdays,
            hours_kst: next.hours_kst,
            daily_limit: next.daily_limit,
            auto_topup: next.auto_topup,
            min_queue: next.min_queue,
          } as any,
          { onConflict: "site_id" },
        );
      setSaving(false);
      if (!error) setSettings(next);
      return error;
    },
    [siteId, settings],
  );

  return { settings, loading, saving, save, reload: load };
}
