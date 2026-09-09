import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "./tests/reader-recovery",
  workers: 1,
  timeout: 90_000,
  use: { ...base.use, baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4297" },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? base.webServer : {
    command: "npm run build:web && npm run preview -w @tldr/web -- --port 4297 --strictPort",
    url: "http://127.0.0.1:4297",
    reuseExistingServer: false,
    timeout: 180_000,
    env: { VITE_SUPABASE_URL: "https://reader-qa.supabase.test", VITE_SUPABASE_ANON_KEY: "reader-placeholder", VITE_SUPABASE_PUBLISHABLE_KEY: "reader-placeholder" }
  }
});
