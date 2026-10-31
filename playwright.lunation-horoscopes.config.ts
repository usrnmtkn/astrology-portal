import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual", testMatch: ["lunation-horoscopes.spec.ts", "lunation-eclipse-publication.spec.ts", "composition-complete-sources.spec.ts", "fallback-horoscope-studio.spec.ts"], timeout: 120_000,
  projects: [
    { name: "ratm", testMatch: "lunation-horoscopes.spec.ts", use: { baseURL: "http://127.0.0.1:4395" } },
    { name: "source-publication", testMatch: ["lunation-eclipse-publication.spec.ts", "composition-complete-sources.spec.ts", "fallback-horoscope-studio.spec.ts"], use: { baseURL: "http://127.0.0.1:4396" } }
  ],
  workers: 1, reporter: "list",
  use: { baseURL: "http://127.0.0.1:4395", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: [
    { command: "npm run build:admin && npm run preview -w @tldr/admin -- --port 4395 --strictPort", url: "http://127.0.0.1:4395", reuseExistingServer: false, timeout: 180_000 },
    { command: "npm run build:web && npm run preview -w @tldr/web -- --port 4396 --strictPort", url: "http://127.0.0.1:4396", reuseExistingServer: false, timeout: 180_000,
      env: { VITE_SUPABASE_URL: "https://visual-smoke.supabase.test", VITE_SUPABASE_ANON_KEY: "visual-smoke-placeholder", VITE_SUPABASE_PUBLISHABLE_KEY: "" } }
  ]
});
