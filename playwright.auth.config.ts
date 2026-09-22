import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: ["client-facing-user-flows.spec.ts", "you-report-auth.spec.ts", "you-report-page.spec.ts", "auth-account-isolation.spec.ts", "report-library-ui.spec.ts", "report-library-delete.spec.ts"],
  grep: /Reports |shared Friends|report delete|auth callback|auth access|account session|journal sync|Account route|Account and Settings child navigation|signed-in user can open Account journal|recovered session|stale account reads|signed-in page account|failed account recovery/u,
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit-iphone", use: { ...devices["iPhone 13"] } }
  ]
});
