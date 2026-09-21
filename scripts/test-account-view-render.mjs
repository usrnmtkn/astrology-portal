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
  const { AccountView } = await server.ssrLoadModule("/src/features/account/AccountView.tsx");
  const html = renderToStaticMarkup(React.createElement(AccountView, {
    profile: {
      id: "account-1",
      name: "Alex Morgan",
      email: "alex@example.com",
      phone: "+12125550100",
      provider: "phone",
      sun: "Aries",
      moon: "Cancer",
      rising: "Libra",
      charts: []
    },
    savedBirthCity: "New York City, NY",
    savedBirthDate: "1990-04-10",
    savedBirthTime: "08:30",
    onAccountDeleted() {},
    onBirthDetailsChange() {},
    onPhoneChange() {},
    onSignOut() {},
    onSocialProfileChange() {}
  }));

  assert.match(html, /class="account-page page-shell--narrow"/);
  assert.match(html, /Alex Morgan/);
  assert.match(html, /Phone ending in 0100/);
  assert.match(html, /aria-label="Birth date"/);
  assert.match(html, /value="1990-04-10"/);
  assert.match(html, /Open journal/);
  assert.match(html, /Export account/);
  assert.match(html, /Erase check-ins/);
  assert.match(html, /Delete account/);
  assert.match(html, /<h1>account\.<\/h1>/);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.doesNotMatch(html, /Delete your TLDR Astro account/);
  assert.doesNotMatch(html, /Erase your mood and journal entries/);
  assert.doesNotMatch(html, /Check your current phone/);
} finally {
  await server.close();
}

console.log("Account view render tests passed.");
