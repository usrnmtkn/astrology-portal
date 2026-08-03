import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  root: "./apps/web",
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent"
});

try {
  const { settingsSubpageFromHref, settingsSubpageHref } = await server.ssrLoadModule(
    "/src/features/settings/settingsRouting.ts"
  );

  assert.equal(settingsSubpageFromHref("https://example.com/#settings"), "root");
  assert.equal(
    settingsSubpageFromHref("https://example.com/#settings?view=blocked-accounts"),
    "blocked-accounts"
  );
  assert.equal(settingsSubpageFromHref("not a URL"), "root");
  assert.equal(
    new URL(settingsSubpageHref("https://example.com/#settings", "blocked-accounts")).hash,
    "#settings?view=blocked-accounts"
  );
  assert.equal(
    new URL(settingsSubpageHref("https://example.com/#settings?view=blocked-accounts", "root")).hash,
    "#settings"
  );
} finally {
  await server.close();
}

console.log("Settings routing tests passed.");
