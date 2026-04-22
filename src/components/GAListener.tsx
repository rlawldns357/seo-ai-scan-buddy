import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initGA, trackPageView } from "@/lib/ga";

/**
 * Mounts inside <BrowserRouter>. Initializes GA once and sends a
 * `page_view` on every SPA route change. Renders nothing.
 */
export default function GAListener() {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}
