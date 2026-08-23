import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

export function browserTestWebServer(targetURL: string) {
  const previewUrl = new URL(targetURL);
  const isLocalPreview = ["127.0.0.1", "localhost", "::1"].includes(previewUrl.hostname);
  if (!isLocalPreview) return undefined;

  const previewPort = previewUrl.port || (previewUrl.protocol === "https:" ? "443" : "80");
  if (!/^\d{2,5}$/u.test(previewPort)) {
    throw new Error(`Playwright preview port is invalid: ${previewPort}`);
  }

  return {
    command: `npm run build:web && npm run preview -w @tldr/web -- --port ${previewPort}`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: targetURL
  };
}

export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./test-results/playwright",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  // Local browser verification is release-path verification: build the current
  // checkout, start a new preview process, and fail if another process already
  // owns the URL. Remote URLs (for example production smoke checks) are never
  // replaced by a local server.
  webServer: browserTestWebServer(baseURL),
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
