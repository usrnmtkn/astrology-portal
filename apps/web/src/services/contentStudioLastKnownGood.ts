export type ContentStudioLastKnownGoodRow = {
  id: string;
  content_key: string;
  surface: string;
  mode: string;
  status?: string | null;
  lane?: string | null;
  review_state?: string | null;
  event_type: string | null;
  target_date: string | null;
  facts?: Record<string, unknown> | null;
  source_snapshot?: Record<string, unknown> | null;
  headline: string | null;
  summary: string | null;
  body: string;
  sections: unknown;
  block_type?: string | null;
  flags?: string[] | null;
  provider?: string | null;
  judge_score?: number | null;
  judge_gate?: string | null;
  model: string | null;
  updated_at: string;
};

type Snapshot = {
  schema: "content-studio-last-known-good-v1";
  rowCount: number;
  rows: ContentStudioLastKnownGoodRow[];
};

let snapshotPromise: Promise<Snapshot | null> | null = null;

async function loadSnapshot() {
  if (!snapshotPromise) {
    snapshotPromise = fetch("/content-studio-last-known-good.json", { cache: "no-cache" })
      .then(async (response) => response.ok ? await response.json() as Snapshot : null)
      .then((snapshot) => snapshot?.schema === "content-studio-last-known-good-v1"
        && Array.isArray(snapshot.rows)
        && snapshot.rowCount === snapshot.rows.length
        ? snapshot
        : null)
      .catch(() => null);
  }
  return snapshotPromise;
}

export async function loadContentStudioLastKnownGoodRows() {
  return (await loadSnapshot())?.rows ?? [];
}
