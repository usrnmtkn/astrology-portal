import { defineConfig } from "@playwright/test";
const port = 4397;
export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./test-results/sky-forecast-runs",
  testMatch: ["calendar-template-preview.spec.ts", "sky-forecast-studio.spec.ts", "content-dashboard-admin-user-flows.spec.ts", "calendar-summary-studio.spec.ts", "sky-summary-studio.spec.ts"],
  timeout: 60_000, workers: 1, reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: {
    command: `npm run build:admin && npm run preview -w @tldr/admin -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 180_000
  }
});
