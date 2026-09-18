import { defineConfig } from "@playwright/test";
export default defineConfig({
 testDir: "./tests/visual", testMatch: ["studio-filter-form-layout.spec.ts", "house-transit-loading.spec.ts", "house-transit-combined-editor.spec.ts", "sky-ingress-composer.spec.ts", "sky-placement-composition.spec.ts", "sky-placement-variables.spec.ts", "sky-writing-library-tables.spec.ts", "content-studio-recovery.spec.ts"], timeout: 90_000,
 workers: 1, reporter: "list", use: { baseURL: "http://127.0.0.1:4295", screenshot: "only-on-failure", trace: "retain-on-failure" },
 webServer: { command: "npm run build:admin && npm run preview -w @tldr/admin -- --port 4295 --strictPort", url: "http://127.0.0.1:4295", reuseExistingServer: false, timeout: 180_000 }
});
