import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/visual", testMatch: ["sky-secondary-editor-crud.spec.ts", "content-studio-needs-attention.spec.ts"], timeout: 45_000,
  workers: 1, reporter: "list", use: { baseURL: "http://127.0.0.1:4297", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: "npm run build:admin && npm run preview -w @tldr/admin -- --port 4297 --strictPort", url: "http://127.0.0.1:4297", reuseExistingServer: false, timeout: 180_000 }
});
