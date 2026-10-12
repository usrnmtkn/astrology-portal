// Show a small first page quickly, then amortize network latency with larger
// compact pages. Always follow the cursor, including older servers with an
// 80-row cap and catalogs beyond the former 10,000-row cutoff.
export const STUDIO_INVENTORY_PAGE_SIZE = 80;
export const STUDIO_INVENTORY_CONTINUATION_PAGE_SIZE = 400;
export const studioInventoryPageSize = (cursor: string | null) => cursor
  ? STUDIO_INVENTORY_CONTINUATION_PAGE_SIZE
  : STUDIO_INVENTORY_PAGE_SIZE;
export const STUDIO_INVENTORY_MAX_PAGES = 2_000;

// Prefixes are independent; cursors within each prefix must remain sequential.
// Keep results in query order so overlap precedence cannot depend on the network.
export async function readStudioInventoryPasses<P, T>(
  passes: P[],
  readPage: (pass: P, cursor: string | null, signal: AbortSignal) => Promise<{ rows: T[]; nextCursor?: unknown }>,
  onPage: (rows: T[], complete: boolean) => void,
  signal?: AbortSignal
) {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const rows = passes.map(() => [] as T[]);
  let nextPass = 0;
  let completed = 0;
  try {
    controller.signal.throwIfAborted();
    await Promise.all(Array.from({ length: Math.min(3, passes.length) }, async () => {
      while (nextPass < passes.length) {
        controller.signal.throwIfAborted();
        const index = nextPass++;
        await readStudioInventoryPages<T>(
          cursor => readPage(passes[index], cursor, controller.signal),
          (pageRows, complete) => {
            rows[index].push(...pageRows);
            if (complete) completed++;
            onPage(rows.flat(), completed === passes.length);
          },
          controller.signal
        );
      }
    }));
    return rows.flat();
  } catch (error) {
    controller.abort(error);
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}

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
