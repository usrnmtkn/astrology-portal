#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const friendTransits = fs.readFileSync(path.join(root, "apps/web/src/features/friends/FriendTransitsTab.tsx"), "utf8");
const transitRenderer = fs.readFileSync(path.join(root, "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs"), "utf8");

const skyNav = dashboard.indexOf('<span>{item.label}</span>');
const friendsNav = dashboard.indexOf('<span>Friends Transits</span>');
const calendarNav = dashboard.indexOf('label: "Calendar Aspects"');
assert.ok(skyNav >= 0 && friendsNav > skyNav && calendarNav >= 0, "Friends Transits must be exposed in the primary Content Studio navigation.");

assert.match(dashboard, /aria-label="Friends Transits sections"/u);
assert.match(dashboard, /<span>Between you two<\/span>/u);
assert.match(dashboard, /Active for \{"\{\{Name\}\}"\}/u, "The admin label must communicate the dynamic selected-friend name rather than hard-code one person.");
assert.match(dashboard, /<span>Where it lands \(house transit\)<\/span>/u);

assert.match(
  dashboard,
  /navigateAdminPage\("knowledge", new URLSearchParams\(\{ section: "friends", q: "bond-effect", audience: "friends" \}\)\)/u,
  "Between you two must deep-link to the bond-effect source rows."
);
assert.match(
  dashboard,
  /navigateAdminPage\("skyWriteups", new URLSearchParams\(\{ view: "transits-to-natal", audience: "friends" \}\)\)/u,
  "Active for {{Name}} must deep-link to Personal Transits."
);
assert.match(
  dashboard,
  /navigateAdminPage\("skyWriteups", new URLSearchParams\(\{ view: "house-transits", audience: "friends" \}\)\)/u,
  "Where it lands must deep-link to House Transits."
);
assert.match(dashboard, /key\.includes\("bond-effect"\)/u, "Bond-effect rows must classify under the Friends fallback-hook section.");

assert.match(friendTransits, /aria-label="Between you two"/u);
assert.match(friendTransits, /Active for \{friendName\}/u);
assert.match(friendTransits, />Where it lands<\/span>/u);
assert.match(transitRenderer, /fallback-hook\/bond-effect-\$\{aspect\}\/\$\{transiting\}/u, "Between you two must stay wired to the bond-effect family the reader actually serves.");

console.log("Admin Friends Transits navigation passed: all three reader sections deep-link to their existing source editors.");
