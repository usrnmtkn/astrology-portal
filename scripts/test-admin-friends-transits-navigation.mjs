#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const friendTransits = fs.readFileSync(path.join(root, "apps/web/src/features/friends/FriendTransitsTab.tsx"), "utf8");
const transitRenderer = fs.readFileSync(path.join(root, "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs"), "utf8");
const app = fs.readFileSync(path.join(root, "apps/web/src/App.tsx"), "utf8");
const transitSources = fs.readFileSync(path.join(root, "apps/admin/src/transitNatalSources.ts"), "utf8");
const houseSources = fs.readFileSync(path.join(root, "apps/admin/src/houseTransitSources.ts"), "utf8");

const skyNav = dashboard.indexOf('<span>{item.label}</span>');
const friendsNav = dashboard.indexOf('<span>Friends Transits</span>');
const calendarNav = dashboard.indexOf('label: "Calendar Aspects"');
assert.ok(skyNav >= 0 && friendsNav > skyNav && calendarNav >= 0, "Friends Transits must be exposed in the primary Content Studio navigation.");

assert.match(dashboard, /aria-label="Friends Transits sections"/u);
assert.match(dashboard, /<span>Between you two<\/span>/u);
assert.match(dashboard, /Active for \{"\{\{Name\}\}"\}/u, "The admin label must communicate the dynamic selected-friend name rather than hard-code one person.");
assert.match(dashboard, /<span>House transit<\/span>/u);

assert.match(
  dashboard,
  /navigateAdminPage\("knowledge", new URLSearchParams\(\{ section: "friends", audience: "friends", workspace: "between-you-two" \}\)\)/u,
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
assert.match(dashboard, /matchesFallbackLibrarySearch/u, "Friends library search must accept reader contact titles such as Moon sextile Mars.");
assert.match(dashboard, /FriendsTransitSectionFinder/u, "Friends Transits must expose one finder for Between you two, Active for Name, and house transit.");
assert.match(dashboard, /hidden=\{!\(activePage === "skyWriteups" \|\| friendsTransitAudience\)\}/u, "Friends Transits section nav must stay visible on Between you two.");

assert.match(friendTransits, /aria-label="Between you two"/u);
assert.match(friendTransits, /Active for \{friendName\}/u);
assert.match(friendTransits, />Where it lands<\/span>/u);
assert.match(transitRenderer, /fallback-hook\/bond-effect-\$\{aspect\}\/\$\{transiting\}/u, "Between you two must stay wired to the bond-effect family the reader actually serves.");


assert.match(dashboard, /const friendsTransitAudience = parseAdminHash\(\)\.params\.get\("audience"\) === "friends"/u);
assert.match(dashboard, /Friends Transits · Active for \{\{Name\}\}/u);
assert.match(dashboard, /Friends Transits · Where it lands/u);
assert.match(dashboard, /Friends Transits · Between you two/u);
assert.match(dashboard, /FriendsBetweenYouTwoComposition/u, "Between you two must show the assembled write-up composition.");
assert.match(dashboard, /query=\{transitNatalQuery\}/u, "Active for Name must also load the Between you two compiled write-up from the same search.");
assert.match(dashboard, /\? "Between you two"/u, "The Between you two workspace must use that reader name instead of Fallback Articles.");
assert.match(dashboard, /audienceKey = audience === "friends" \? "body_they" : "body_you"/u, "Friends previews must resolve body_they instead of silently showing You copy.");
assert.match(dashboard, /if \(audience === "friends" && hasAudienceField\) continue;/u, "An explicitly blank Friends field must not fall back to the You body in the Studio preview.");
for (const name of ["updateTransitNatalSelection", "updateHouseTransitSelection"]) {
  const start = dashboard.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `${name} must remain reachable.`);
  const selection = dashboard.slice(start, dashboard.indexOf("\n  function ", start + 1));
  assert.match(selection, /if \(friendsTransitAudience\) params\.set\("audience", "friends"\);/u, "Friends context must survive selector changes.");
}
assert.match(dashboard, /if \(friendsTransitAudience && \(view === "transits-to-natal" \|\| view === "house-transits"\)\) params\.set\("audience", "friends"\);/u, "Transit tabs preserve the Friends audience; collective Sky tabs leave that audience.");

assert.doesNotMatch(app, /renderTransitHouseEvent/u, "The retired house composition must not return.");
assert.match(app, /renderTransitHouse\(\{/u);
assert.match(transitSources, /renderer.renderTransitAspect/u);
assert.match(transitSources, /renderer.renderTransitReturn/u);
assert.match(houseSources, /authored\/transit-house-intro/u);
assert.match(houseSources, /authored\/transit-house-sign/u);

console.log("Admin Friends Transits navigation passed: all three reader sections deep-link to their existing source editors.");
