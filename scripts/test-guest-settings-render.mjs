import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
  const { GuestSettingsView } = await server.ssrLoadModule("/src/features/settings/GuestSettingsView.tsx");
  const html = renderToStaticMarkup(React.createElement(GuestSettingsView, {
    theme: "dark",
    locationLabel: "Brooklyn, NY",
    sunriseOrbEnabled: true,
    dyslexiaFriendlyFont: false,
    onThemeChange() {},
    onSunriseOrbChange() {},
    onDyslexiaFontChange() {},
    houseSignLabelStyle: "glyph",
    onHouseSignLabelStyleChange() {}
  }));

  assert.match(html, /class="settings-page page-shell--narrow guest-settings-page"/);
  assert.match(html, /Brooklyn, NY/);
  assert.match(html, /aria-label="Theme"/);
  assert.match(html, /aria-label="Toggle gradient background" aria-pressed="true"/);
  assert.match(html, /aria-label="House sign labels"/);
  assert.match(html, /aria-label="Calculation method"/);
  assert.match(html, /Swiss Ephemeris/);
} finally {
  await server.close();
}

console.log("Guest Settings render tests passed.");
