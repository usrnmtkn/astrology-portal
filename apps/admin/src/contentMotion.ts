export type ContentMotion = "retrograde" | "direct" | "unspecified";
export type ContentMotionFilter = "all" | ContentMotion;
export type ContentDestinationFilter = "all" | "sky" | "calendar";
export type ContentPlacementSort = "updated-desc" | "title-asc" | "title-desc" | "retrograde-first" | "direct-first";

type MotionInspectableRow = {
  content_key: string;
  event_type?: string | null;
  headline?: string | null;
  facts?: Record<string, unknown> | null;
  sections?: unknown;
  source_snapshot?: Record<string, unknown> | null;
  surface?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function explicitMotion(value: unknown): ContentMotion | null {
  if (typeof value === "boolean") return value ? "retrograde" : "direct";
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/gu, "-");
  if (["retrograde", "retro", "rx"].includes(normalized)) return "retrograde";
  if (["direct", "station-direct"].includes(normalized)) return "direct";
  return null;
}

function motionFromRecord(value: unknown): ContentMotion | null {
  const candidate = record(value);
  for (const key of ["isRetrograde", "is_retrograde", "retrograde", "motion", "direction", "phase"]) {
    const motion = explicitMotion(candidate[key]);
    if (motion) return motion;
  }
  for (const key of ["facts", "placement", "position", "event", "runtimeFacts", "packageRecord"]) {
    const nested = candidate[key];
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) continue;
    const motion = motionFromRecord(nested);
    if (motion) return motion;
  }
  return null;
}

export function contentMotion(row: MotionInspectableRow): ContentMotion {
  const structured = motionFromRecord(row.facts)
    ?? motionFromRecord(row.source_snapshot)
    ?? motionFromRecord(row.sections);
  if (structured) return structured;

  const identity = `${row.content_key} ${row.event_type ?? ""} ${row.headline ?? ""}`.toLowerCase();
  if (/(?:^|[\s/._-])(?:retrograde|retro|rx)(?:$|[\s/._-])/u.test(identity)) return "retrograde";
  if (/(?:^|[\s/._-])direct(?:$|[\s/._-])/u.test(identity)) return "direct";

  // Canonical placement/article rows are the direct-motion baseline unless the
  // record explicitly says otherwise. Treating these as "unspecified" made the
  // Direct filter hide the normal Sun-through-Pluto placement corpus even though
  // the rows were loaded and reader-governed.
  if (/^sky[./-](?:placement|article)[./-]/u.test(row.content_key.toLowerCase())) return "direct";

  return "unspecified";
}

export function contentDestinations(row: MotionInspectableRow): Set<"sky" | "calendar"> {
  const destinations = new Set<"sky" | "calendar">(["sky"]);
  const facts = record(row.facts);
  const source = record(row.source_snapshot);
  const identity = [
    row.content_key,
    row.event_type,
    row.surface,
    facts.surface,
    facts.destination,
    facts.readerSurface,
    source.surface,
    source.destination
  ].filter((value) => typeof value === "string").join(" ").toLowerCase();
  if (/(?:calendar|lunation|lunar|moon-phase|new-moon|full-moon|station|retrograde|ingress)/u.test(identity)) {
    destinations.add("calendar");
  }
  return destinations;
}

function rowTitle(row: MotionInspectableRow) {
  return (row.headline ?? row.content_key).trim();
}

function updatedAt(row: MotionInspectableRow) {
  const value = Date.parse(row.updated_at ?? row.published_at ?? "");
  return Number.isFinite(value) ? value : 0;
}

export function sortPlacementRows<T extends MotionInspectableRow>(rows: T[], sort: ContentPlacementSort): T[] {
  const motionRank = (motion: ContentMotion, preferred: ContentMotion) => motion === preferred ? 0 : motion === "unspecified" ? 2 : 1;
  return [...rows].sort((left, right) => {
    if (sort === "updated-desc") return updatedAt(right) - updatedAt(left) || rowTitle(left).localeCompare(rowTitle(right));
    if (sort === "title-desc") return rowTitle(right).localeCompare(rowTitle(left));
    if (sort === "retrograde-first") return motionRank(contentMotion(left), "retrograde") - motionRank(contentMotion(right), "retrograde") || rowTitle(left).localeCompare(rowTitle(right));
    if (sort === "direct-first") return motionRank(contentMotion(left), "direct") - motionRank(contentMotion(right), "direct") || rowTitle(left).localeCompare(rowTitle(right));
    return rowTitle(left).localeCompare(rowTitle(right));
  });
}
