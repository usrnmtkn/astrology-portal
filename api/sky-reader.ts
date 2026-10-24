import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import skyHandler, { readSkyCalculationInputs } from "./sky.js";
import publicationsHandler from "./content-publications.js";
import readerHandler from "./content-reader.js";
import { canonicalPublicationLedger, publicationLedgerTag } from "../apps/web/src/services/publicationLedgerTransport.js";
import { publicationAllowsContent, type ContentPublication } from "../apps/web/src/content/contentPublicationState.js";
import type { SkySnapshot } from "../apps/web/src/types.js";
import type { GeneratedContentRow } from "../apps/web/src/services/generatedContent.js";
import { lunationReaderContentKeys } from "../apps/web/src/content/lunationArticleIdentity.js";

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;
async function readPublic(handler: Handler, request: object) {
  let body = "";
  const headers: Record<string, string> = {};
  const response = { statusCode: 200, setHeader(name: string, value: string) { headers[name] = value; },
    end(value?: string) { body = value ?? ""; } };
  await handler(request as IncomingMessage, response as unknown as ServerResponse);
  return { status: response.statusCode, headers, value: JSON.parse(body) };
}

/** Calculate and assemble the public opening screen close to its sources. The
 * exact existing public handlers own projection and publication admission.
 * No owner session, private row, writing provider or production write is used.
 */
export function createInitialSkyReaderHandler(readRows = (query: { ids: string[]; keys: string[] }) =>
  readPublic(readerHandler, { method: "POST", url: "/api/content-reader", headers: {}, body: query })) {
return async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("allow", "GET"); res.statusCode = 405; res.end(JSON.stringify({ error: "Use GET." })); return;
  }
  try {
    readSkyCalculationInputs(req.url ?? "");
    if (new URL(req.url!, "http://localhost").searchParams.get("detail") !== "placements") throw new Error();
  } catch {
    res.statusCode = 400; res.end(JSON.stringify({ error: "Invalid initial Sky inputs." })); return;
  }
  const publications = readPublic(publicationsHandler, { method: "GET", url: "/api/content-publications?scope=sky-list", headers: {} });
  void publications.catch(() => {});
  const calculated = await readPublic(skyHandler, { method: "GET", url: req.url, headers: {} });
  if (calculated.status !== 200) { res.statusCode = calculated.status; res.end(JSON.stringify(calculated.value)); return; }
  const sky = calculated.value.sky as SkySnapshot;
  let initialReader: unknown = null;
  try {
    const ledgerResponse = await publications;
    if (ledgerResponse.status !== 200 || ledgerResponse.value.schema !== "tldr-sky-list-publications/v1") throw new Error("Sky lifecycle unavailable.");
    const ledger = canonicalPublicationLedger(ledgerResponse.value.publications);
    const byKey = new Map(ledger.map(row => [row.content_key, row]));
    // @ts-ignore Generated from the shared App renderer before API packaging.
    const { renderInitialSkyReader, requiredInitialSkySourceKeys } = await import("../server/initial-sky-reader/dist/initial-reader.mjs");
    const lunationKeys = sky.moonEvent ? lunationReaderContentKeys({ startsAt: sky.moonEvent.occursAt,
      sign: sky.moonEvent.sign, title: sky.moonEvent.name }) : [];
    const sharedKey = (key: string) => /^(?:cms\/sky-|fallback-vocab\/|cc\/(?:planet|sign)\/|sky[.-]ingress[./-]|sky-[a-z-]+-enters-)/u.test(key)
      || lunationKeys.includes(key);
    const requiredKeys = new Set<string>(requiredInitialSkySourceKeys(sky, ledger));
    const current = ledger.filter(row => row.state === "live" && row.row_id && (requiredKeys.has(row.content_key) || sharedKey(row.content_key)));
    const pages = [];
    for (let index = 0; index < current.length; index += 100) {
      const batch = current.slice(index, index + 100);
      pages.push(readRows({ ids: [...new Set(batch.map(row => row.row_id!))], keys: batch.map(row => row.content_key) }));
    }
    const responses = await Promise.all(pages);
    if (responses.some(response => response.status !== 200 || response.value.schema !== "content-reader-row-v1"
      || response.value.nextCursor !== null || !Array.isArray(response.value.rows))) throw new Error(`Sky reader rows unavailable (${responses.map(response => `${response.status}:${response.value.error ?? response.value.schema}`).join(", ")}).`);
    const rows = responses.flatMap(response => response.value.rows) as GeneratedContentRow[];
    if (rows.some(row => !publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date, byKey))) throw new Error("Sky source revision changed.");
    const previews = await renderInitialSkyReader(sky, rows, ledger);
    const sources = rows.filter(row => sharedKey(row.content_key));
    const digest = createHash("sha256").update(JSON.stringify([sky, previews, ledger, sources])).digest("hex");
    initialReader = { schema: "tldr-initial-sky-reader/v1", previews, publications: ledger,
      publicationTag: await publicationLedgerTag(ledger), sources, digest };
  } catch (error) {
    console.warn("Initial Sky assembly unavailable; the normal source loader remains required.", error instanceof Error ? error.message : "Unknown source error.");
  }
  res.statusCode = 200;
  res.end(JSON.stringify({ sky, initialReader }));
}
}
export default createInitialSkyReaderHandler();
