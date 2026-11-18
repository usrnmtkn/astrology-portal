import { apiSubjectFromUserChart } from "../../web/src/services/chartProfile";
import type { TldrAstroSubject } from "../../web/src/services/tldrastroApi";

export type WheelPreviewChart = { id: string; name: string; own: boolean; subject: TldrAstroSubject };
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" ? value : "";

/** Parse only birth inputs; never reuse stored placements or write profile/cache data. */
export function wheelTooltipPreviewCharts(profileData: unknown, friends: unknown[], ownerId: string): WheelPreviewChart[] {
  const root = record(profileData), profile = record(root.profile ?? root);
  const own = record(Array.isArray(profile.charts) ? profile.charts[0] : null);
  const inputs = [
    { id: "own", name: text(profile.name) || "Your chart", own: true, birth: own },
    ...friends.map(record).filter(row => row.owner_user_id === ownerId).map(row => ({
      id: text(row.id), name: text(row.display_name), own: false,
      birth: { birthDate: row.birth_date, birthTime: row.birth_time, birthTimeUnknown: row.birth_time_unknown,
        birthLocation: { label: row.birth_place, latitude: row.birth_latitude, longitude: row.birth_longitude, timeZone: row.birth_timezone } }
    }))
  ];
  return inputs.flatMap(input => {
    const location = record(input.birth.birthLocation);
    if (!input.id || typeof location.latitude !== "number" || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90
      || typeof location.longitude !== "number" || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180 || !text(location.timeZone)) return [];
    try {
      new Intl.DateTimeFormat("en", { timeZone: text(location.timeZone) });
      const subject = apiSubjectFromUserChart({ name: input.name }, {
        birthDate: text(input.birth.birthDate), birthTime: input.birth.birthTimeUnknown === true ? "Time unknown" : text(input.birth.birthTime),
        birthTimeUnknown: input.birth.birthTimeUnknown === true,
        birthLocation: { label: text(location.label), latitude: location.latitude, longitude: location.longitude, timeZone: text(location.timeZone) }
      });
      if (!subject) return [];
      const date = new Date(`${subject.datetime.date}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== subject.datetime.date) return [];
      return [{ id: input.id, name: input.name, own: input.own, subject }];
    } catch { return []; }
  });
}
