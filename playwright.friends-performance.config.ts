import { defineConfig } from "@playwright/test";
import readerConfig from "./playwright.config";

// Recording network bodies and DOM snapshots competes with the page for CPU
// and disk during these sub-second measurements. Keep reader-flow traces in
// the general suite; this matrix retains its scenarios, budgets and failure
// screenshots while measuring without recording overhead.
export default defineConfig(readerConfig, {
  testMatch: "friends-loading-performance.spec.ts",
  use: { trace: "off" }
});
