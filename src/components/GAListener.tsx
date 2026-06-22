import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initGA, trackPageView } from "@/lib/ga";
import { trackEvent } from "@/lib/analytics";

/**
 * Mounts inside <BrowserRouter>. Initializes GA once and sends a
 * `page_view` on every SPA route change. Renders nothing.
 *
 * Also mirrors the page_view into Supabase `analytics_events` so the
 * admin dashboard can compute pageviews / home-page funnel denominators
 * without depending on GA4 Data API.
 */
export default function GAListener() {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    const path = location.pathname + location.search;
    trackPageView(path);
    // Fire-and-forget Supabase mirror. Failures are swallowed in trackEvent.
    void trackEvent("page_view", { path: location.pathname });
  }, [location.pathname, location.search]);

  return null;
}

