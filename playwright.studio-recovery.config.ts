import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/visual", testMatch: "content-studio-recovery.spec.ts", timeout: 90_000,
  workers: 1, reporter: "list",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4298", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: process.env.STUDIO_PRODUCTION_ENTRY === "1"
      ? "npm run build && npm run preview -w @tldr/web -- --port 4298 --strictPort"
      : "npm run build:admin && npm run preview -w @tldr/admin -- --port 4298 --strictPort",
    url: "http://127.0.0.1:4298", reuseExistingServer: false, timeout: 600_000
  }
});
