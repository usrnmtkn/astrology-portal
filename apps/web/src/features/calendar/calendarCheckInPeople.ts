import { getVerifiedAuthUser } from "../../services/auth";
import { listManualCharts } from "../../services/manualCharts";
import { listSocialFriends } from "../../services/socialFriends";

export type CalendarCheckInPerson = {
  id: string;
  name: string;
  kind: "Chart" | "Friend";
  handle?: string;
};

// Only the signed-in account's own charts and accepted friends are candidates.
// Check-ins keep private name labels; choosing someone never sends a request.
export async function loadCalendarCheckInPeople() {
  const user = await getVerifiedAuthUser();
  if (!user) return { people: [], incomplete: false };
  const [charts, friends] = await Promise.allSettled([
    listManualCharts(user.id),
    listSocialFriends()
  ]);
  if ((await getVerifiedAuthUser())?.id !== user.id) {
    throw new Error("The signed-in account changed.");
  }
  const people: CalendarCheckInPerson[] = [
    ...(charts.status === "fulfilled" ? charts.value
      .filter(chart => chart.ownerUserId === user.id)
      .map(chart => ({ id: `chart:${chart.id}`, name: chart.displayName, kind: "Chart" as const })) : []),
    ...(friends.status === "fulfilled" ? friends.value.map(friend => ({
      id: `friend:${friend.userId}`, name: friend.displayName, kind: "Friend" as const, handle: friend.handle
    })) : [])
  ];
  return {
    people: people.sort((a, b) => a.name.localeCompare(b.name)),
    incomplete: charts.status === "rejected" || friends.status === "rejected"
  };
}
