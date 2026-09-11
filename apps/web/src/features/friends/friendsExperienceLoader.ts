import { initialFriendProfileContentRequest } from "./friendsRouting";

export const loadManualChartsPanel = () => import("./ManualChartsPanel");

// Keep these imports behind Friends intent, but start all three together. The
// entry point can call this without first downloading/evaluating the full App.
export const loadFriendsExperience = () => Promise.all([
  import("../../routes/FriendsRoute"),
  loadManualChartsPanel(),
  import("./FriendsWorkspaceShell")
]).then(([routeModule, manualChartsModule]) => {
  const initialProfileTab = initialFriendProfileContentRequest(window.location.href);
  if (initialProfileTab) {
    manualChartsModule.preloadFriendProfileComponents(initialProfileTab);
  }
  return [routeModule, manualChartsModule] as const;
});

export const preloadFriendsExperience = () => loadFriendsExperience();
