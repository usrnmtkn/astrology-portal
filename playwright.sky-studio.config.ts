import { defineConfig } from "@playwright/test";
function previewPort(name: string, fallback: number) {
  const port = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`Invalid ${name}`);
  return port;
}
const adminPort = previewPort("SKY_STUDIO_TEST_PORT", 4293);
const readerPort = previewPort("SKY_READER_TEST_PORT", 4294);
export default defineConfig({
  testDir: "./tests/visual", testMatch: "sky-summary-studio.spec.ts", timeout: 90_000,
  workers: 1, reporter: "list", use: { baseURL: `http://127.0.0.1:${adminPort}`, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: [
    { command: `npm run build:admin && npm run preview -w @tldr/admin -- --port ${adminPort} --strictPort`, url: `http://127.0.0.1:${adminPort}`, reuseExistingServer: false, timeout: 180_000 },
    { command: `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= VITE_SUPABASE_PUBLISHABLE_KEY= npm run build:web && npm run preview -w @tldr/web -- --port ${readerPort} --strictPort`, url: `http://127.0.0.1:${readerPort}`, reuseExistingServer: false, timeout: 180_000 }
  ]
});
