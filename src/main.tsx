import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Auto-recover from stale dynamic-import chunks.
 *
 * When Vite (HMR/dev) or a new deploy invalidates previously-cached chunks,
 * `React.lazy(() => import(...))` rejects with messages like:
 *   - "Failed to fetch dynamically imported module"
 *   - "Importing a module script failed"
 *   - "error loading dynamically imported module"
 * This leaves the Suspense boundary stuck → blank screen.
 *
 * We listen for those errors and force a one-shot hard reload so the browser
 * fetches the latest chunk graph. A sessionStorage flag prevents reload loops.
 */
const RELOAD_FLAG = "__lov_chunk_reload__";

function isChunkLoadError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("error loading dynamically imported module") ||
    m.includes("importing a module script failed") ||
    m.includes("failed to import") ||
    (m.includes("loading chunk") && m.includes("failed"))
  );
}

function tryReload() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || "0");
    const now = Date.now();
    // Avoid reload loops: only auto-reload once per 10s window.
    if (now - last < 10_000) return;
    sessionStorage.setItem(RELOAD_FLAG, String(now));
  } catch {
    // sessionStorage unavailable → still attempt reload once.
  }
  window.location.reload();
}

window.addEventListener("error", (event) => {
  if (isChunkLoadError(event.message) || isChunkLoadError(event.error?.message)) {
    tryReload();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = typeof reason === "string" ? reason : reason?.message;
  if (isChunkLoadError(message)) {
    tryReload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
