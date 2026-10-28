import type { ManualChart } from "../../services/manualCharts";
import { manualChartHasReliableBirthTime } from "../../services/manualCharts";
import { natalChartHasCompletePlacements } from "../../services/natalChartCompleteness";
import { socialFriendToChart, type ConnectedSocialFriend } from "../../services/socialFriends";

export type FriendsFeedFilter = "all" | "circle" | "charts";
export type FriendsFeedPerson = {
  id: string; displayName: string; avatarUrl?: string;
  source: Exclude<FriendsFeedFilter,"all">; chart: ManualChart; canCompare: boolean;
};

export function isFriendsFeedFilter(value: string): value is FriendsFeedFilter {
  return value === "all" || value === "circle" || value === "charts";
}

export function readFriendsFeedFilter(ownerId: string): FriendsFeedFilter {
  try {
    const value = localStorage.getItem(`tldrastro:friendsFeedSource:${ownerId}`);
    return value && isFriendsFeedFilter(value) ? value : "all";
  } catch { return "all"; }
}

export function saveFriendsFeedFilter(ownerId: string,value: FriendsFeedFilter) {
  try { localStorage.setItem(`tldrastro:friendsFeedSource:${ownerId}`,value); }
  catch { /* The selection still works for this visit when storage is unavailable. */ }
}

/** Circle consent stays separate from viewer-owned chart access. An ID is
 * namespaced by source; equal names or chart IDs never merge two people. */
export function friendsFeedPeople(friends: ConnectedSocialFriend[], charts: ManualChart[], ownerId: string): FriendsFeedPerson[] {
  const circle: FriendsFeedPerson[] = friends.filter(friend => friend.friendSharesChart && friend.natalChart).map(friend => ({
    id:friend.userId, displayName:friend.displayName, avatarUrl:friend.avatarUrl,
    source:"circle", chart:socialFriendToChart(friend), canCompare:friend.viewerSharesChart
  }));
  const saved: FriendsFeedPerson[] = charts.filter(chart => chart.ownerUserId === ownerId && chart.chartType === "person").map(chart => ({
    id:`chart:${chart.id}`,displayName:chart.displayName,source:"charts",chart,canCompare:true
  }));
  return [...circle,...saved].filter(person => natalChartHasCompletePlacements(person.chart.natalChart,!manualChartHasReliableBirthTime(person.chart)));
}

export function selectFriendsFeedPeople(people: FriendsFeedPerson[],filter: FriendsFeedFilter) {
  return people.filter(person => filter === "all" || person.source === filter);
}
