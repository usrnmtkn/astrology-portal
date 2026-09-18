import { defineConfig } from "@playwright/test";

/** Verifies the deployed Studio bundle, so it starts no local server. */
export default defineConfig({
  testDir: "./tests/visual", testMatch: "sky-writing-library-tables.spec.ts", timeout: 90_000,
  workers: 1, reporter: "list",
  use: { baseURL: process.env.STUDIO_PRODUCTION_URL ?? "https://tldrastro.vercel.app", screenshot: "only-on-failure", trace: "retain-on-failure" }
});
