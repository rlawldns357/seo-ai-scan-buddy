/**
 * Google Analytics 4 (gtag) loader.
 *
 * - Reads measurement ID from `VITE_GA_MEASUREMENT_ID`.
 * - If the env var is missing/empty, gtag is NOT loaded (no-op).
 * - Exposes `initGA()` to inject the script once, and `trackPageView()`
 *   to send `page_view` events on SPA route changes.
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// Prefer build-time env var; fall back to hardcoded ID (safe to expose publicly).
const ENV_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const MEASUREMENT_ID: string | undefined = ENV_ID && ENV_ID.trim().length > 0
  ? ENV_ID
  : "G-KGHC8QDM10";
let initialized = false;

export function isGAEnabled(): boolean {
  return typeof MEASUREMENT_ID === "string" && MEASUREMENT_ID.trim().length > 0;
}

export function initGA(): void {
  if (initialized || !isGAEnabled() || typeof window === "undefined") return;
  initialized = true;

  const id = MEASUREMENT_ID!.trim();

  // Inject gtag.js
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag as typeof window.gtag;

  window.gtag("js", new Date());
  // Disable automatic page_view; we send it manually on route changes.
  window.gtag("config", id, { send_page_view: false });
}

export function trackPageView(path: string, title?: string): void {
  if (!isGAEnabled() || typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: title ?? document.title,
  });
}
