import { supabase } from "@/integrations/supabase/client";

export async function adminInvoke<T = any>(action: string, extra: Record<string, any> = {}): Promise<T | null> {
  const password = sessionStorage.getItem("admin_pw");
  if (!password) return null;
  const { data, error } = await supabase.functions.invoke("admin-insights", {
    body: { password, action, ...extra },
  });
  if (error) {
    console.warn(`[admin] ${action} failed`, error);
    return null;
  }
  return data as T;
}

export function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text);
}
