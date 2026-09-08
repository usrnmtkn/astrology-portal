import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testDir: "./tests/studio-auth",
  testMatch: "studio-owner-login.spec.ts",
  workers: 1,
  use: { ...base.use, baseURL: "http://127.0.0.1:4296" },
  webServer: {
    command: "npm run build:web && npm run preview -w @tldr/web -- --port 4296 --strictPort",
    url: "http://127.0.0.1:4296",
    reuseExistingServer: false,
    timeout: 180_000,
    env: { VITE_SUPABASE_URL: "https://studio-auth.supabase.test", VITE_SUPABASE_ANON_KEY: "studio-auth-placeholder", VITE_SUPABASE_PUBLISHABLE_KEY: "studio-auth-placeholder", VITE_CONTENT_GENERATION_SECRET: "" }
  }
});
