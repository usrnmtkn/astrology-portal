// The inventory API caps pages at 80 rows. Page through its cursor, including
// catalogs larger than the former 125-page / 10,000-row cutoff.
export const STUDIO_INVENTORY_PAGE_SIZE = 80;
export const STUDIO_INVENTORY_MAX_PAGES = 2_000;

export async function readStudioInventoryPages<T>(
  readPage: (cursor: string | null) => Promise<{ rows: T[]; nextCursor?: unknown }>,
  onPage: (rows: T[], complete: boolean) => void,
  signal?: AbortSignal
) {
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < STUDIO_INVENTORY_MAX_PAGES; page += 1) {
    signal?.throwIfAborted();
    const result = await readPage(cursor);
    signal?.throwIfAborted();
    const next = result.nextCursor;
    const complete = next === null || next === undefined;
    if (!complete && (typeof next !== "string" || !next || cursors.has(next))) {
      throw new Error("Content Studio returned an invalid pagination cursor. The inventory is incomplete. Refresh rows to retry.");
    }
    onPage(result.rows, complete);
    if (complete) return;
    cursor = next as string;
    cursors.add(cursor);
  }
  throw new Error("Content Studio inventory exceeded the page limit. The list is incomplete; choose a section to narrow it.");
}
