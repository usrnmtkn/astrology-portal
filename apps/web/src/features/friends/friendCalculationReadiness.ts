import type { FriendProfileTab } from "./friendsRouting";

export type FriendCalculationReadiness = {
  currentSky: boolean;
  profileNatal: boolean;
};

export const idleFriendCalculationReadiness: FriendCalculationReadiness = {
  currentSky: false,
  profileNatal: false
};

export function initialFriendCalculationReadiness(
  activeTab: FriendProfileTab | null
): FriendCalculationReadiness {
  if (!activeTab) {
    return idleFriendCalculationReadiness;
  }

  return {
    // Compatibility's Pair Daily card needs today's transits for both charts.
    currentSky: activeTab === "transits" || activeTab === "compatibility",
    profileNatal: activeTab !== "natal"
  };
}

export function shouldPreloadInitialFriendCalculationRuntime(
  activeTab: FriendProfileTab | null
) {
  return Boolean(activeTab && activeTab !== "natal");
}

export function activeFriendProfileContentRequest({
  activeTab,
  profileActive
}: {
  activeTab: FriendProfileTab;
  profileActive: boolean;
}): FriendProfileTab | null {
  return profileActive ? activeTab : null;
}

export function friendCalculationReadiness({
  activeTab,
  isEventChart,
  profileActive
}: {
  activeTab: FriendProfileTab;
  isEventChart: boolean;
  profileActive: boolean;
}): FriendCalculationReadiness {
  if (!profileActive) {
    return idleFriendCalculationReadiness;
  }

  const relationshipChartNeeded = !isEventChart && activeTab !== "natal";

  return {
    currentSky: activeTab === "transits" || (relationshipChartNeeded && activeTab === "compatibility"),
    profileNatal: relationshipChartNeeded
  };
}

export function shouldRunCurrentSkyCalculation(
  mode: string,
  friendReadiness: FriendCalculationReadiness
) {
  return mode === "guest"
    || mode === "member"
    || mode === "profile"
    || mode === "calendar"
    || (mode === "friends" && friendReadiness.currentSky);
}

export function shouldRunProfileNatalCalculation(
  mode: string,
  profileModeActive: boolean,
  friendReadiness: FriendCalculationReadiness
) {
  return profileModeActive
    || (mode === "friends" && friendReadiness.profileNatal);
}
