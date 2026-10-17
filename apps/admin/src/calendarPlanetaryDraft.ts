import type { AdminDraft } from "./GeneratedContentAdminDashboard";
import { calendarPlanetaryIdentityKeys, calendarPlanetaryTitle, planetaryName, type CalendarPlanetaryKind, type CalendarPlanetarySelection } from "./calendarPlanetarySources.js";

export function calendarPlanetaryDraft(kind: CalendarPlanetaryKind, selection: CalendarPlanetarySelection): AdminDraft | null {
  const contentKey = calendarPlanetaryIdentityKeys(kind, selection)[0];
  if (!contentKey) return null;
  const facts = { planet: planetaryName(selection.planet), sign: planetaryName(selection.sign),
    ...(kind === "station" ? { direction: selection.direction, phase: `station-${selection.direction}` } : {}) };
  return {
    id: null, contentKey, surface: "sky", mode: "feed", status: "DRAFT",
    headline: calendarPlanetaryTitle({ kind, ...selection }), summary: "", body: "",
    lane: "serving", reviewState: "EDITORIAL_REVIEW_REQUIRED", blockType: "calendar_event",
    promptVersion: "manual-admin", sections: { slots: facts }, facts, reviewerNotes: "",
    sourceSnapshot: { contentType: "owner-authored-calendar-event", content_role: "authored_card",
      review_status: "needs_review", authoringSource: "admin-dashboard-calendar-planetary", canonicalKey: contentKey }
  };
}
