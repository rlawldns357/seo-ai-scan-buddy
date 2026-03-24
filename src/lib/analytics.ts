import { supabase } from "@/integrations/supabase/client";

type EventName =
  | "analysis_start"
  | "analysis_complete"
  | "analysis_fail"
  | "email_submit_success"
  | "email_submit_duplicate"
  | "email_submit_fail"
  | "sticky_email_submit"
  | "cta_click";

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId =
      sessionStorage.getItem("analytics_session") ??
      crypto.randomUUID();
    sessionStorage.setItem("analytics_session", sessionId);
  }
  return sessionId;
}

export async function trackEvent(
  eventName: EventName,
  eventData: Record<string, string | number | boolean> = {},
  url?: string
) {
  try {
    await supabase.from("analytics_events").insert([{
      event_name: eventName,
      event_data: eventData,
      session_id: getSessionId(),
      url: url ?? window.location.href,
    }]);
  } catch (e) {
    console.warn("[analytics] failed to track event:", eventName, e);
  }
}
