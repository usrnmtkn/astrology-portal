import { defineConfig } from "@playwright/test";

const webEntry = process.env.STUDIO_PRODUCTION_ENTRY === "1";
export default defineConfig({
  testDir: "./tests/visual",
  testMatch: "studio-deployment-assets.spec.ts",
  timeout: 60_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4299", screenshot: "only-on-failure" },
  webServer: {
    command: `VERCEL_SKEW_PROTECTION_ENABLED=1 VERCEL_DEPLOYMENT_ID=dpl_0123456789abcdefghijklmnopqr npm run ${webEntry ? "build" : "build:admin"} && npm run preview -w @tldr/${webEntry ? "web" : "admin"} -- --port 4299 --strictPort`,
    url: "http://127.0.0.1:4299", reuseExistingServer: false, timeout: 600_000
  }
});
