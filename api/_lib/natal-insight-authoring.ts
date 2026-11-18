import { createHash } from "node:crypto";
import { AdminHttpError, adminFetchJson } from "./admin-http.js";
import { natalInsightTopics } from "../../apps/web/src/content/natalInsightCatalog.js";
import { natalInsightFacts, natalInsightReadingKey } from "../../apps/web/src/services/natalInsightReading.js";
import type { SkySnapshot } from "../../apps/web/src/types.js";

type Storage = (table: string, params: URLSearchParams) => Promise<Record<string, any>[]>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export function requireReaderId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !uuid.test(value)) throw new AdminHttpError(400, "Choose a saved reader account.");
}

export async function findNatalInsightReaders(query: string, read: Storage) {
  const cleaned = query.trim();
  if (cleaned.length < 2) return [];
  if (cleaned.length > 100) throw new AdminHttpError(400, "Search must be 100 characters or fewer.");
  const params = new URLSearchParams({ select: "user_id,data", limit: "20", order: "updated_at.desc" });
  if (uuid.test(cleaned)) params.set("user_id", `eq.${cleaned}`);
  else {
    // PostgREST filter syntax is not accepted as part of a name search.
    const name = cleaned.replace(/[^\p{L}\p{N}\s'-]/gu, "");
    if (name.trim().length < 2) return [];
    params.set("or", `(data->profile->>name.ilike.*${name}*,data->>name.ilike.*${name}*)`);
  }
  return (await read("user_profiles", params)).map(row => ({ userId: row.user_id, name: (row.data?.profile ?? row.data)?.name || "Unnamed reader" }));
}

export async function natalInsightCharts(userId: string, read: Storage) {
  requireReaderId(userId);
  const [profiles, manual] = await Promise.all([
    read("user_profiles", new URLSearchParams({ select: "user_id,data,updated_at", user_id: `eq.${userId}`, limit: "1" })),
    read("manual_charts", new URLSearchParams({ select: "id,owner_user_id,display_name,relationship_type,birth_date,birth_time,birth_time_unknown,birth_place,birth_latitude,birth_longitude,birth_timezone,natal_chart,updated_at", owner_user_id: `eq.${userId}`, order: "display_name.asc" }))
  ]);
  const row = profiles[0];
  const profile = row?.data?.profile ?? row?.data;
  const own = profile?.charts?.[0];
  const charts = [];
  if (own) charts.push({ subjectId: userId, audience: "you", name: profile.name || "Your chart", version: row.updated_at,
    birthDate: own.birthDate, birthTime: own.birthTime, birthTimeKnown: Boolean(own.birthTime && !["Time unknown", "Birth time needed"].includes(own.birthTime)),
    location: own.birthLocation, sky: null });
  for (const chart of manual) {
    if (chart.relationship_type === "event") continue;
    charts.push({ subjectId: chart.id, audience: "friend", name: chart.display_name, version: chart.updated_at,
      birthDate: chart.birth_date, birthTime: chart.birth_time, birthTimeKnown: !chart.birth_time_unknown && Boolean(chart.birth_time),
      location: { label: chart.birth_place, latitude: chart.birth_latitude, longitude: chart.birth_longitude, timeZone: chart.birth_timezone }, sky: chart.natal_chart });
  }
  return charts;
}

export async function openNatalInsightDraft(input: any, read: Storage, base: string, headers: Record<string, string>, select: string) {
  requireReaderId(input.userId);
  const topic = natalInsightTopics.find(item => item.id === input.topic);
  if (!topic || !["you", "friend"].includes(input.audience)) throw new AdminHttpError(400, "Choose a natal topic and audience.");
  const chart = (await natalInsightCharts(input.userId, read)).find(item => item.subjectId === input.subjectId && item.audience === input.audience);
  if (!chart) throw new AdminHttpError(404, "This chart does not belong to the selected reader.");
  if (!chart.version || chart.version !== input.chartVersion) throw new AdminHttpError(409, "This chart changed. Reload it before starting a reading.");
  const sky = input.sky as SkySnapshot;
  if (!sky || !Array.isArray(sky.positions) || !sky.positions.length || !Array.isArray(sky.aspects)
    || !sky.positions.every(p => p && typeof p.planet === "string" && typeof p.sign === "string" && Number.isFinite(p.degree))) {
    throw new AdminHttpError(400, "A calculated natal chart is required.");
  }
  // This authenticated authoring input comes from the same calculator used by
  // the reader. The fact packet and hash are always derived here, never supplied.
  const contentKey = await natalInsightReadingKey(topic.id, sky, chart.birthTimeKnown, chart.audience as "you" | "friend");
  const params = new URLSearchParams({ select, user_id: `eq.${input.userId}`, subject_type: "eq.natal_summary", subject_id: `eq.${chart.subjectId}`, content_key: `eq.${contentKey}`, target_date: "is.null", mode: "eq.article", order: "updated_at.desc", limit: "1" });
  const existing = await read("user_generated_interpretations", params);
  if (existing.length) return existing;
  // Deterministic UUID plus ignore-duplicates makes retry/concurrent creation
  // idempotent, including this table's nullable target_date unique key.
  const hash = createHash("sha256").update(JSON.stringify([input.userId, chart.subjectId, contentKey])).digest("hex");
  const id = `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
  const response = await adminFetchJson(`${base}/rest/v1/user_generated_interpretations?${new URLSearchParams({ on_conflict: "id", select })}`, {
    method: "POST", headers: { ...headers, prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({ id, user_id: input.userId, subject_type: "natal_summary", subject_id: chart.subjectId, content_key: contentKey,
      surface: "natal", mode: "article", target_date: null, event_type: "natal-insight", status: "DRAFT", body: "",
      headline: `${chart.name} · ${topic.title}`, provider: "owner-content-studio", model: null,
      facts: natalInsightFacts(topic.id, sky, chart.birthTimeKnown), source_snapshot: { authoring: "manual", chartVersion: chart.version } })
  });
  if (!response.ok) throw new AdminHttpError(502, "The private reading could not be created. Reload before retrying.");
  const saved = await read("user_generated_interpretations", params);
  if (saved.length !== 1 || !saved[0].updated_at) throw new AdminHttpError(502, "The saved reading could not be verified. Reload before retrying.");
  return saved;
}
