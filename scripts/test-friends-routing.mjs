import assert from "node:assert/strict";
import {
  friendDetailRoutePath,
  friendHandleProfileHref,
  friendProfileHref,
  friendsHashParts,
  friendsRouteStateFromHref,
  friendsTabFromHref,
  friendsTabHref,
  isFriendsHref,
  parseFriendProfileTab,
  parseFriendsTab,
  registerFriendHandleRoute,
  updateFriendProfileUrl
} from "../apps/web/src/features/friends/friendsRouting.ts";
import { friendProfileWorkForTab } from "../apps/web/src/features/friends/friendProfileWork.ts";
import { forecastDialogReturnUrl, returnToArticleParent } from "../apps/web/src/services/articleNavigation.ts";

assert.equal(parseFriendsTab("charts"), "charts");
assert.equal(parseFriendsTab("requests"), "requests");
assert.equal(parseFriendsTab("feed"), "feed");
assert.equal(parseFriendsTab("circle"), "circle");
assert.equal(parseFriendsTab("unknown"), "feed");
assert.equal(parseFriendProfileTab("synastry"), "synastry");
assert.equal(parseFriendProfileTab("unknown"), "compatibility");

assert.deepEqual(friendProfileWorkForTab("compatibility"), {
  compatibility: true,
  composite: false,
  natal: false,
  synastry: false,
  synastryContacts: true,
  transits: false
});
assert.equal(friendProfileWorkForTab("natal").synastryContacts, false);
assert.equal(friendProfileWorkForTab("natal").natal, true);
assert.equal(friendProfileWorkForTab("synastry").synastry, true);
assert.equal(friendProfileWorkForTab("composite").composite, true);
assert.equal(friendProfileWorkForTab("transits").transits, true);

const hashParts = friendsHashParts("#/friends?tab=requests&chart=chart%201");
assert.equal(hashParts.path, "friends");
assert.equal(hashParts.params.get("tab"), "requests");
assert.equal(hashParts.params.get("chart"), "chart 1");

assert.deepEqual(
  friendsRouteStateFromHref("https://example.com/friends?tab=charts&chart=chart-1&view=synastry&detail=contact-1"),
  {
    tab: "charts",
    chartId: "chart-1",
    view: "synastry",
    detail: "contact-1"
  }
);
assert.deepEqual(
  friendsRouteStateFromHref("https://example.com/#friends?tab=requests"),
  {
    tab: "requests",
    chartId: null,
    view: "compatibility",
    detail: null
  }
);
assert.equal(friendsRouteStateFromHref("https://example.com/#sky"), null);
assert.equal(friendsRouteStateFromHref("not a url"), null);

assert.equal(friendsTabFromHref("https://example.com/friends?tab=charts"), "charts");
assert.equal(friendsTabFromHref("https://example.com/#friends?tab=requests"), "requests");
assert.equal(friendsTabFromHref("https://example.com/#sky"), "circle");
assert.equal(isFriendsHref("https://example.com/friends"), true);
assert.equal(isFriendsHref("https://example.com/#/friends?tab=charts"), true);
assert.equal(isFriendsHref("https://example.com/#sky"), false);

const standaloneTabUrl = new URL(
  friendsTabHref("https://example.com/friends?tab=charts&chart=abc&view=natal&detail=planet", "requests")
);
assert.equal(standaloneTabUrl.pathname, "/friends");
assert.equal(standaloneTabUrl.search, "?tab=requests");

const hashTabUrl = new URL(
  friendsTabHref("https://example.com/#friends?tab=charts&chart=abc&view=natal&detail=planet", "circle")
);
assert.equal(hashTabUrl.hash, "#friends?tab=circle");

const standaloneProfileUrl = new URL(
  friendProfileHref("https://example.com/friends?campaign=summer", "chart / 1", "composite", "pattern / 1")
);
assert.equal(standaloneProfileUrl.searchParams.get("campaign"), "summer");
assert.equal(standaloneProfileUrl.searchParams.get("tab"), "charts");
assert.equal(standaloneProfileUrl.searchParams.get("chart"), "chart / 1");
assert.equal(standaloneProfileUrl.searchParams.get("view"), "composite");
assert.equal(standaloneProfileUrl.searchParams.get("detail"), "pattern / 1");

const hashProfileUrl = new URL(friendProfileHref("https://example.com/#sky", "chart-2", "natal"));
assert.equal(hashProfileUrl.hash, "#friends?tab=charts&chart=chart-2&view=natal");

assert.equal(registerFriendHandleRoute("project_author", "social:user-1"), true);
assert.equal(registerFriendHandleRoute("settings", "social:user-2"), false);
assert.deepEqual(
  friendsRouteStateFromHref("https://example.com/project_author"),
  {
    tab: "charts",
    chartId: "social:user-1",
    view: "compatibility",
    detail: null
  }
);
assert.deepEqual(
  friendsRouteStateFromHref("https://example.com/project_author/transits?detail=moon-square-mars"),
  {
    tab: "charts",
    chartId: "social:user-1",
    view: "transits",
    detail: "moon-square-mars"
  }
);
assert.equal(friendsRouteStateFromHref("https://example.com/project_author/not-a-tab"), null);
assert.equal(friendsRouteStateFromHref("https://example.com/settings"), null);
assert.equal(friendsRouteStateFromHref("https://example.com/learn"), null);
assert.equal(friendsTabFromHref("https://example.com/project_author/natal"), "charts");
assert.equal(isFriendsHref("https://example.com/project_author"), true);

const readableCompatibilityUrl = new URL(
  friendHandleProfileHref("https://example.com/friends?tab=charts", "@project_author", "compatibility")
);
assert.equal(readableCompatibilityUrl.pathname, "/project_author");
assert.equal(readableCompatibilityUrl.search, "");
assert.equal(readableCompatibilityUrl.hash, "");

const readableTransitUrl = new URL(
  friendProfileHref("https://example.com/friends", "social:user-1", "transits")
);
assert.equal(readableTransitUrl.pathname, "/project_author/transits");
assert.equal(readableTransitUrl.search, "");

const readableFriendsHubUrl = new URL(friendsTabHref("https://example.com/project_author/natal", "requests"));
assert.equal(readableFriendsHubUrl.pathname, "/friends");
assert.equal(readableFriendsHubUrl.search, "?tab=requests");

assert.equal(
  friendDetailRoutePath("chart / 1", "synastry", "contact / 1"),
  "friends?tab=charts&chart=chart+%2F+1&view=synastry&detail=contact+%2F+1"
);

const feedHref = "https://example.com/?date=2026-10-13#friends?tab=feed";
const entries = [];
let backCount = 0;
globalThis.window = {
  location: { href: feedHref, origin: "https://example.com" },
  history: {
    state: null,
    pushState(state, _, href) { entries.push({ state, href }); this.state = state; window.location.href = href; },
    replaceState(state, _, href) { this.state = state; window.location.href = href; },
    back() { backCount += 1; }
  }
};
updateFriendProfileUrl("social:user-1", "transits", "push", "transit-mars-square-moon");
assert.equal(entries.length, 1);
assert.equal(entries[0].state.articleParent, feedHref);
assert.equal(entries[0].state.articleUrl, window.location.href);
assert.equal(new URL(window.location.href).hash, "");
updateFriendProfileUrl("social:user-1", "transits", "push", "transit-mars-square-moon");
assert.equal(entries.length, 1, "Rehydrating an already-routed article must not push another entry.");
assert.equal(returnToArticleParent(), true);
assert.equal(backCount, 1);
window.location.href = "https://example.com/#friends?tab=charts&chart=manual-1&view=natal";
updateFriendProfileUrl("manual-1", "natal", "push", "natal-placement-sun");
assert.equal(entries[1].state.articleParent, "https://example.com/#friends?tab=charts&chart=manual-1&view=natal");
assert.equal(entries[1].state.articleUrl, window.location.href);
const originalPopStateEvent = globalThis.PopStateEvent;
globalThis.PopStateEvent = class extends Event {};
const events = [];
window.dispatchEvent = event => { events.push(event.type); return true; };
for (const parent of [
  "https://example.com/?date=2026-10-29&flowPair=social%3Auser-1&flowDate=2026-10-30#friends?tab=feed",
  "https://example.com/friends?tab=feed&date=2026-10-29&flowPair=social%3Auser-1&flowDate=2026-10-30"
]) {
  window.location.href = parent;
  assert.equal(forecastDialogReturnUrl(parent)?.href, parent);
  const url = new URL("https://example.com/project_author/transits?detail=transit-sun-sextile-lilith&date=2026-10-30");
  const returnUrl = new URL(parent);
  url.searchParams.set("flowReturn", returnUrl.pathname + returnUrl.search + returnUrl.hash);
  window.location.href = url.href;
  window.history.state = null;
  assert.equal(returnToArticleParent(), true, "Reopened links restore the exact friend and selected day without entry state.");
  assert.equal(window.location.href, parent);
  assert.equal(returnToArticleParent(), false, "The restored dialog must not create a return loop.");
}
assert.deepEqual(events, ["popstate", "popstate"]);
for (const invalid of [
  "https://elsewhere.example/friends?flowPair=friend&flowDate=2026-10-29",
  "/friends?tab=charts&flowPair=friend&flowDate=2026-10-29",
  "/friends?tab=feed&chart=another&flowPair=friend&flowDate=2026-10-29",
  "/friends?flowPair=friend&flowDate=invalid",
  "/friends?flowDate=2026-10-29",
  "/project_author/transits?flowPair=friend&flowDate=2026-10-29#friends?tab=feed"
]) {
  assert.equal(forecastDialogReturnUrl(invalid), null);
  const article = new URL("https://example.com/project_author/transits?detail=transit-sun-sextile-lilith");
  article.searchParams.set("flowReturn", invalid);
  window.location.href = article.href;
  window.history.state = null;
  assert.equal(returnToArticleParent(), false, "Invalid return context must leave the article untouched.");
  assert.equal(window.location.href, article.href);
}
if (originalPopStateEvent) globalThis.PopStateEvent = originalPopStateEvent;
else delete globalThis.PopStateEvent;
delete globalThis.window;

console.log("Friends routing tests passed, including single-entry articles and immediate reader parents.");
