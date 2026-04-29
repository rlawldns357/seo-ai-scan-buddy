type EventName =
  | "analysis_start"
  | "analysis_complete"
  | "analysis_fail"
  | "analyze_fail"
  | "email_submit_success"
  | "email_submit_duplicate"
  | "email_submit_fail"
  | "sticky_email_submit"
  | "cta_click"
  | "report_pdf_download"
  | "consultation_submit_success"
  | "consultation_submit_fail"
  | "result_email_submit"
  | "report_email_sent"
  | "share_click"
  | "naver_store_teaser_click";

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
  eventData: Record<string, string | number | boolean | string[]> = {},
  url?: string
) {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
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
