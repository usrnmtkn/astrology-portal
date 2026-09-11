import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Reader flows wait for asynchronously calculated calendar content. CI traces
// show the correct event arriving after the default five-second assertion wait.
// Preserve the complete suite, fresh preview, retries, and content assertions.
export default defineConfig(base, {
  timeout: 90_000,
  expect: { ...base.expect, timeout: 30_000 }
});
