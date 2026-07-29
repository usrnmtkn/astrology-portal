// TLDR Astro content package — single browser entry point.
// Codex: import ONLY from the prebuilt dist/tldr-content.js (or this file if bundling
// yourself). Do not edit or fork the resolver sources; selection stays
// authored-or-v3-or-SOURCE_GAP and grammar is correct by construction.
export * from "./renderFallback.browser";
export * from "./renderTransitSynastry.browser";

// Version stamp: the app must surface this in its debug/about screen and the dashboard
// admin must show it next to the import status, so the owner can verify at a glance
// that the running app and the dashboard are on the current package.
export const PACKAGE_VERSION = "v3-2026-07-28i";
