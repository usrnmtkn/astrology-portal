import type { FriendProfileTab } from "./friendsRouting";

type FriendsContentLoadingMode =
  | "guest"
  | "member"
  | "profile"
  | "friends"
  | "calendar"
  | "account"
  | "settings";

type FriendsContentLoadingState = {
  mode: FriendsContentLoadingMode;
  friendNatalContentRequested: boolean;
  friendRelationshipContentRequests: ReadonlySet<Exclude<FriendProfileTab, "natal">>;
  skyPlacementPersonalizationRequested?: boolean;
};

export function shouldLoadEmptyHouseFallbackContent({
  mode,
  friendNatalContentRequested
}: Pick<FriendsContentLoadingState, "mode" | "friendNatalContentRequested">) {
  return mode === "profile" || (mode === "friends" && friendNatalContentRequested);
}

export function shouldHydrateFallbackDashboardContent({
  mode,
  friendNatalContentRequested,
  friendRelationshipContentRequests
}: Pick<FriendsContentLoadingState, "mode" | "friendNatalContentRequested" | "friendRelationshipContentRequests">) {
  if (mode !== "friends") return true;

  // Keep the bare Friends list fast, but once a reader opens any Friend detail
  // surface, hydrate the approved Content Studio mirror so owner-published edits
  // override the checked-in fallback package immediately.
  return friendNatalContentRequested || friendRelationshipContentRequests.size > 0;
}

export function shouldHydrateCompatibilityDashboardContent({
  mode,
  friendRelationshipContentRequests
}: Pick<FriendsContentLoadingState, "mode" | "friendRelationshipContentRequests">) {
  return mode === "friends" && friendRelationshipContentRequests.has("compatibility");
}

export function shouldLoadDeferredFallbackContent({
  mode,
  friendNatalContentRequested,
  friendRelationshipContentRequests,
  skyPlacementPersonalizationRequested = false
}: FriendsContentLoadingState) {
  if (skyPlacementPersonalizationRequested) return true;
  if (mode === "guest" || mode === "member") return false;
  if (mode !== "friends") return true;

  return friendNatalContentRequested || friendRelationshipContentRequests.has("transits");
}

export function shouldLoadRelationshipFallbackContent({
  mode,
  friendRelationshipContentRequests
}: Pick<FriendsContentLoadingState, "mode" | "friendRelationshipContentRequests">) {
  return mode === "friends" && friendRelationshipContentRequests.size > 0;
}

export function shouldStartRelationshipFallbackEnhancement({
  mode,
  friendRelationshipContentRequests,
  currentSkyReady,
  profileNatalReady
}: Pick<FriendsContentLoadingState, "mode" | "friendRelationshipContentRequests"> & {
  currentSkyReady: boolean;
  profileNatalReady: boolean;
}) {
  if (!shouldLoadRelationshipFallbackContent({ mode, friendRelationshipContentRequests })) {
    return false;
  }

  return [...friendRelationshipContentRequests].some((request) => (
    request === "transits" ? currentSkyReady : profileNatalReady
  ));
}
