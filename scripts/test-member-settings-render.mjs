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
  const { MemberSettingsView } = await server.ssrLoadModule("/src/features/settings/MemberSettingsView.tsx");
  const defaultLocation = {
    label: "New York City, NY",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York"
  };
  const html = renderToStaticMarkup(React.createElement(MemberSettingsView, {
    currentLocation: "Brooklyn, New York",
    currentLocationData: defaultLocation,
    currentCityDisplay: "Brooklyn, NY",
    defaultLocation,
    houseSignLabelStyle: "glyph",
    socialProfile: { userId: "member-1", handle: "stargazer", displayName: "Stargazer", isPrivate: true },
    theme: "dark",
    sunriseOrbEnabled: true,
    dyslexiaFriendlyFont: false,
    onCurrentLocationChange() {},
    onSocialProfileChange() {},
    onThemeChange() {},
    onSunriseOrbChange() {},
    onDyslexiaFontChange() {},
    onHouseSignLabelStyleChange() {},
    resolveLocationLabel: () => defaultLocation
  }));

  assert.match(html, /class="settings-page page-shell--narrow"/);
  assert.match(html, /Brooklyn, NY/);
  assert.match(html, /aria-label="Make account private" aria-pressed="true"/);
  assert.match(html, /Blocked accounts/);
  assert.match(html, /aria-label="Theme"/);
  assert.match(html, /aria-label="House sign labels"/);
  assert.match(html, /aria-label="Calculation method"/);
} finally {
  await server.close();
}

console.log("Member Settings render tests passed.");
