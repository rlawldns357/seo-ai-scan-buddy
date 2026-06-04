import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";

/**
 * Build-time version 포맷: MAJOR.MINOR.YYMMDD.<5자리 태그>-beta
 * 예) 0.22.260604.03371-beta
 *   - MAJOR_MINOR: 수동으로 올리는 베이스 (0.22)
 *   - YYMMDD: 빌드 날짜(UTC)
 *   - 5자리 태그: git 커밋수(5자리 패딩) → 없으면 HHMMSS 앞 5자리로 폴백
 */
const MAJOR_MINOR = "0.22";
function resolveBuildVersion(): string {
  try {
    const d = new Date();
    const pad = (n: number, w = 2) => String(n).padStart(w, "0");
    const datePart = `${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
    let commitCount = "";
    try {
      commitCount = execSync("git rev-list --count HEAD", { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      // git unavailable in some build envs — skip silently
    }
    const tag5 = commitCount
      ? pad(Number(commitCount), 5)
      : `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`.slice(0, 5);
    return `${MAJOR_MINOR}.${datePart}.${tag5}-beta`;
  } catch {
    return `${MAJOR_MINOR}.0.00000-beta`;
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
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_BASE_VERSION__: JSON.stringify(BASE_VERSION),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
