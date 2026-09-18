import type { FriendProfileTab } from "./friendsRouting";

type FriendsContentLoadingMode =
  | "guest"
  | "member"
  | "profile"
  | "friends"
  | "calendar"
  | "account"
  | "settings"
  | "learn";

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
  if (mode === "learn") return false;
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
  if (mode === "guest" || mode === "member" || mode === "learn") return false;
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
  friendRelationshipContentRequests
}: Pick<FriendsContentLoadingState, "mode" | "friendRelationshipContentRequests">) {
  // Explicit chart intent can fetch content while calculations run independently.
  return shouldLoadRelationshipFallbackContent({ mode, friendRelationshipContentRequests });
}

export function friendTransitsCopyReady({
  deferredLoaded,
  relationshipLoaded
}: {
  deferredLoaded: boolean;
  relationshipLoaded: boolean;
}) {
  return deferredLoaded && relationshipLoaded;
}
