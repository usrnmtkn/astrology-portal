import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/visual",
  testMatch: ["content-dashboard-admin-user-flows.spec.ts", "client-facing-user-flows.spec.ts"],
  grep: /Planet lived sources belong to Sky Placement|Natal planet introductions|natal variables support inline|surface maps select source families|natal reader uses dedicated planet introductions|You Chiron placement preserves/,
  workers: 1,
  timeout: 120_000,
  use: { baseURL: "http://127.0.0.1:4385", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: {
    command: "npm run build:web && npm run preview -w @tldr/web -- --port 4385 --strictPort",
    url: "http://127.0.0.1:4385", reuseExistingServer: false, timeout: 180_000
  }
});
