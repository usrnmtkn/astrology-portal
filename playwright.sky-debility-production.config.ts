import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual", testMatch: "sky-debility-production.spec.ts", timeout: 90_000,
  workers: 1, reporter: "list",
  use: { screenshot: "only-on-failure", trace: "retain-on-failure" }
});
