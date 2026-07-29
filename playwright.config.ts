import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./test-results/playwright",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run preview",
    reuseExistingServer: true,
    timeout: 30_000,
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173"
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 }
      }
    }
  ]
});
