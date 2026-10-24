import type { IncomingMessage, ServerResponse } from "node:http";
import { publicationLedgerBoundaries } from "../apps/web/src/content/contentPublicationState.js";
import { canonicalPublicationLedger, publicationLedgerTag, publicationLedgerTagMatches } from "../apps/web/src/services/publicationLedgerTransport.js";
import { isSkyListPublicationKey } from "../apps/web/src/content/skyListPublicationScope.js";
import { publicationLedgerKey } from "../apps/web/src/content/contentPublicationState.js";

/** Aggregate the existing anonymous reads close to the database. Every request
 * rereads all ranges; 304 means the complete current ledger matched, never TTL
 * freshness or a cached server guess. Owner sessions/service roles are unused. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("allow", "GET"); res.statusCode = 405;
    res.end(JSON.stringify({ error: "Use GET." })); return;
  }
  try {
    const scope = new URL(req.url ?? "/api/content-publications", "http://localhost").searchParams.get("scope");
    if (scope !== null && scope !== "sky-list") {
      res.statusCode = 400; res.end(JSON.stringify({ error: "Invalid publication scope." })); return;
    }
    const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/u, "");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY
      ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
    let anonymous = key.startsWith("sb_publishable_");
    if (!anonymous) {
      try { anonymous = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "anon"; }
      catch { /* Unknown/elevated keys must never read this public endpoint. */ }
    }
    if (!base || !anonymous) throw new Error("Public reader configuration unavailable.");
    const headers: Record<string, string> = { apikey: key };
    if (!key.startsWith("sb_publishable_")) headers.authorization = `Bearer ${key}`;
    const boundaries = publicationLedgerBoundaries;
    const signal = AbortSignal.timeout(7000);
    const pages = await Promise.all(boundaries.slice(0, -1).map(async (lower, index) => {
      const upper = boundaries[index + 1], records = [];
      let cursor: string | null = null;
      for (;;) {
        const params = new URLSearchParams({
          select: "content_key,state,revision,row_id,row_updated_at,updated_at",
          order: "content_key.asc", limit: "1000"
        });
        if (lower) params.append("content_key", `gte.${lower}`);
        if (upper) params.append("content_key", `lt.${upper}`);
        if (cursor) params.append("content_key", `gt.${cursor}`);
        const response = await fetch(`${base}/rest/v1/content_publications?${params}`, { headers, signal, cache: "no-store" });
        if (!response.ok) throw new Error("Publication read failed.");
        const rows = canonicalPublicationLedger(await response.json());
        if (rows.some(row => lower && row.content_key < lower || upper && row.content_key >= upper
          || cursor && row.content_key <= cursor)) throw new Error("Invalid publication page.");
        records.push(...rows);
        if (rows.length < 1000) return records;
        cursor = rows[rows.length - 1].content_key;
      }
    }));
    const complete = canonicalPublicationLedger(pages.flat());
    if (scope && !complete.some(row => row.content_key === publicationLedgerKey)) throw new Error("Publication ledger unavailable.");
    const publications = scope ? complete.filter(row => isSkyListPublicationKey(row.content_key)) : complete;
    const tag = await publicationLedgerTag(publications);
    res.setHeader("etag", tag);
    if (publicationLedgerTagMatches(req.headers["if-none-match"], tag)) {
      res.statusCode = 304; res.end(); return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ schema: scope ? "tldr-sky-list-publications/v1" : "tldr-publications/v1", publications }));
  } catch {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: "Publication state unavailable." }));
  }
}
