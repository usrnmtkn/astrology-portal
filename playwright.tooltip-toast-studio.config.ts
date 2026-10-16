import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  testMatch: "tooltip-toast-viewport.spec.ts",
  grep: /Studio toast/,
  fullyParallel: true,
  timeout: 45_000,
  use: { baseURL: "http://127.0.0.1:4291", screenshot: "only-on-failure", trace: "off" },
  webServer: {
    command: "npm run build -w @tldr/astro-knowledge && npm run build:admin && npm run preview -w @tldr/admin -- --port 4291 --strictPort",
    url: "http://127.0.0.1:4291",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: "https://visual-smoke.supabase.test",
      VITE_SUPABASE_ANON_KEY: "visual-smoke-placeholder"
    }
  }
});
