import {defineConfig} from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({...base,
  testMatch: [
    "content-dashboard-admin-user-flows.spec.ts",
    "calendar-review-queue-api.spec.ts",
    "studio-publication-recovery.spec.ts",
    "approved-source-recovery.spec.ts",
    "studio-publication-status.spec.ts",
    "sky-template-first-save.spec.ts",
    "review-queue-workflow.spec.ts",
    "calendar-aspect-create.spec.ts",
    "compatibility-aspect-create.spec.ts",
    "calendar-aspect-retrograde.spec.ts",
    "calendar-planetary-studio.spec.ts",
    "studio-section-visibility.spec.ts",
    "content-publication-offline.spec.ts",
    "content-studio-reader-destinations.spec.ts",
    "content-studio-needs-attention.spec.ts",
    "studio-dedicated-editor-routing.spec.ts",
    "studio-inventory-loading.spec.ts",
    "studio-formatting-publication.spec.ts",
    "astro-101-reader-recovery.spec.ts",
    "calendar-subscriptions.spec.ts",
    "studio-csv.spec.ts",
    "studio-article-memory.spec.ts",
    "studio-owner-publishing.spec.ts",
    "natal-friend-publication.spec.ts",
    "personal-transit-copy-versions.spec.ts",
    "aspect-pattern-draft-preservation.spec.ts",
    "studio-variable-draft-preservation.spec.ts"
  ],
  outputDir:"./test-results/studio-admin-flows"
});
