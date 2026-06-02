import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";

/**
 * Build-time version: BASE_VERSION + auto build tag.
 * BASE_VERSION을 올리면 major/minor, 빌드 시점마다 자동으로 build tag가 붙어
 * 퍼블리시할 때마다 자동 증가합니다. (예: 0.21.0-beta+260602.1733)
 */
const BASE_VERSION = "0.21.0-beta";
function resolveBuildVersion(): string {
  try {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const datePart = `${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
    const timePart = `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
    let commitCount = "";
    try {
      commitCount = execSync("git rev-list --count HEAD", { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      // git unavailable in some build envs — skip silently
    }
    const buildTag = commitCount ? `${datePart}.${commitCount}` : `${datePart}.${timePart}`;
    return `${BASE_VERSION}+${buildTag}`;
  } catch {
    return BASE_VERSION;
  }
}
const APP_VERSION = resolveBuildVersion();


/**
 * Converts Vite-injected CSS <link rel="stylesheet"> to non-render-blocking
 * by using the print/onload pattern. Critical CSS is already inlined in index.html.
 */
function deferCssPlugin(): Plugin {
  return {
    name: "defer-css",
    enforce: "post",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
        '<link rel="stylesheet" href="$1" media="print" onload="this.media=\'all\'" crossorigin><noscript><link rel="stylesheet" href="$1" crossorigin></noscript>'
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    deferCssPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
