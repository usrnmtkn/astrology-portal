import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/visual", testMatch: "sky-summary-studio.spec.ts", timeout: 90_000,
  workers: 1, reporter: "list", use: { baseURL: "http://127.0.0.1:4293", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: [
    { command: "npm run build:admin && npm run preview -w @tldr/admin -- --port 4293 --strictPort", url: "http://127.0.0.1:4293", reuseExistingServer: false, timeout: 180_000 },
    { command: "VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= VITE_SUPABASE_PUBLISHABLE_KEY= npm run build:web && npm run preview -w @tldr/web -- --port 4294 --strictPort", url: "http://127.0.0.1:4294", reuseExistingServer: false, timeout: 180_000 }
  ]
});
