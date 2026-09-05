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
  registerFriendHandleRoute
} from "../apps/web/src/features/friends/friendsRouting.ts";
import { friendProfileWorkForTab } from "../apps/web/src/features/friends/friendProfileWork.ts";

assert.equal(parseFriendsTab("charts"), "charts");
assert.equal(parseFriendsTab("requests"), "requests");
assert.equal(parseFriendsTab("unknown"), "circle");
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

assert.equal(registerFriendHandleRoute("MarieSatori", "social:user-1"), true);
assert.equal(registerFriendHandleRoute("settings", "social:user-2"), false);
assert.deepEqual(
  friendsRouteStateFromHref("https://example.com/mariesatori"),
  {
    tab: "charts",
    chartId: "social:user-1",
    view: "compatibility",
    detail: null
  }
);
assert.deepEqual(
  friendsRouteStateFromHref("https://example.com/mariesatori/transits?detail=moon-square-mars"),
  {
    tab: "charts",
    chartId: "social:user-1",
    view: "transits",
    detail: "moon-square-mars"
  }
);
assert.equal(friendsRouteStateFromHref("https://example.com/mariesatori/not-a-tab"), null);
assert.equal(friendsRouteStateFromHref("https://example.com/settings"), null);
assert.equal(friendsTabFromHref("https://example.com/mariesatori/natal"), "charts");
assert.equal(isFriendsHref("https://example.com/mariesatori"), true);

const readableCompatibilityUrl = new URL(
  friendHandleProfileHref("https://example.com/friends?tab=charts", "@MarieSatori", "compatibility")
);
assert.equal(readableCompatibilityUrl.pathname, "/mariesatori");
assert.equal(readableCompatibilityUrl.search, "");
assert.equal(readableCompatibilityUrl.hash, "");

const readableTransitUrl = new URL(
  friendProfileHref("https://example.com/friends", "social:user-1", "transits")
);
assert.equal(readableTransitUrl.pathname, "/mariesatori/transits");
assert.equal(readableTransitUrl.search, "");

const readableFriendsHubUrl = new URL(friendsTabHref("https://example.com/mariesatori/natal", "requests"));
assert.equal(readableFriendsHubUrl.pathname, "/friends");
assert.equal(readableFriendsHubUrl.search, "?tab=requests");

assert.equal(
  friendDetailRoutePath("chart / 1", "synastry", "contact / 1"),
  "friends?tab=charts&chart=chart+%2F+1&view=synastry&detail=contact+%2F+1"
);

console.log("Friends routing tests passed.");
