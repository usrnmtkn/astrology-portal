import { defineConfig } from "@playwright/test";
import { browserTestWebServer } from "./playwright.config";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4396";
const server = browserTestWebServer(baseURL);
export default defineConfig({
  testDir: "./tests/visual",
  testMatch: "content-dashboard-admin-user-flows.spec.ts",
  grep: /Natal editorial library|Natal Empty Houses opens|surface map organizes editable/,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: { baseURL, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: server ? { ...server, timeout: 240000 } : undefined
});
