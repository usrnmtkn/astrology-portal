import { defineConfig } from "@playwright/test";
const port = 4297;
export default defineConfig({
  testDir: "./tests/visual", testMatch: /sky-debility-(composition|reader)\.spec\.ts$/, timeout: 90_000,
  workers: 1, reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: [
    { command: `npm run build:admin && npm run preview -w @tldr/admin -- --port ${port} --strictPort`,
      url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 180_000 },
    { command: "VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= VITE_SUPABASE_PUBLISHABLE_KEY= npm run build:web && npm run preview -w @tldr/web -- --port 4298 --strictPort",
      url: "http://127.0.0.1:4298", reuseExistingServer: false, timeout: 180_000 }
  ]
});
