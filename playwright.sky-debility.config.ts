import { defineConfig } from "@playwright/test";
const port = 4297;
export default defineConfig({
  testDir: "./tests/visual", testMatch: "sky-debility-composition.spec.ts", timeout: 90_000,
  workers: 1, reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: `npm run build:admin && npm run preview -w @tldr/admin -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 180_000 }
});
