import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import skyHandler, { readSkyCalculationInputs } from "./sky.js";
import publicationsHandler from "./content-publications.js";
import readerHandler from "./content-reader.js";
import { canonicalPublicationLedger, publicationLedgerTag } from "../apps/web/src/services/publicationLedgerTransport.js";
import { publicationAllowsContent } from "../apps/web/src/content/contentPublicationState.js";
import type { SkySnapshot } from "../apps/web/src/types.js";
import type { GeneratedContentRow } from "../apps/web/src/services/generatedContent.js";
import { lunationReaderContentKeys } from "../apps/web/src/content/lunationArticleIdentity.js";
import { calculateInitialSky } from "./_lib/sky-reader-calculation.js";

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
  readPublic(readerHandler, { method: "POST", url: "/api/content-reader", headers: {}, body: query }), assemblyTimeoutMs = 5_000) {
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
  const started = performance.now();
  const timings: string[] = [];
  const timed = async <T,>(name: string, work: Promise<T>) => {
    const start = performance.now();
    try { return await work; } finally { timings.push(`${name};dur=${(performance.now() - start).toFixed(1)}`); }
  };
  const sharedSourceKey = (key: string) => /^(?:cms\/sky-|fallback-vocab\/|cc\/(?:planet|sign)\/|sky[.-]ingress[./-]|sky-[a-z-]+-enters-)/u.test(key);
  // Load the shared renderer while the worker and publication I/O run, rather
  // than introducing an additional cold import after astronomy completes.
  // @ts-ignore Generated from the shared App renderer before API packaging.
  const renderer = import("../server/initial-sky-reader/dist/initial-reader.mjs");
  void renderer.catch(() => {});
  // @ts-ignore Small, self-contained key selector built beside the renderer.
  const sourceSelection=import("../server/initial-sky-reader/dist/initial-selection.mjs");
  void sourceSelection.catch(()=>{});
  void renderer.then(()=>timings.push(`renderer_ready;dur=${(performance.now()-started).toFixed(1)}`)).catch(()=>{});
  const readBatches = (current: ReturnType<typeof canonicalPublicationLedger>) => Promise.all(
    Array.from({length: Math.ceil(current.length / 100)}, (_, index) => {
      const batch = current.slice(index * 100, (index + 1) * 100);
      return readRows({ids: [...new Set(batch.map(row => row.row_id!))], keys: batch.map(row => row.content_key)});
    }));
  const publications = timed("publications", readPublic(publicationsHandler, { method: "GET", url: "/api/content-publications?scope=sky-list", headers: {} }));
  void publications.catch(() => {});
  // These complete public sources do not depend on the calculated placements.
  // Read them while the worker calculates; selected editions retain their own
  // exact-key read after facts arrive and all rows pass the same admission below.
  const earlyRows = publications.then(response => {
    if (response.status !== 200 || response.value.schema !== "tldr-sky-list-publications/v1") throw new Error("Sky lifecycle unavailable.");
    const current = canonicalPublicationLedger(response.value.publications)
      .filter(row => row.state === "live" && row.row_id && sharedSourceKey(row.content_key));
    const responses = timed("shared_rows", readBatches(current));
    void responses.catch(() => {});
    return {keys: new Set(current.map(row => row.content_key)), responses};
  });
  void earlyRows.catch(() => {});
  let resolveSelection!: (sky:SkySnapshot|null)=>void;
  const selection = new Promise<SkySnapshot|null>(resolve=>{resolveSelection=resolve;});
  const selectedRows = Promise.all([publications,sourceSelection,selection]).then(([response,reader,sky])=>{
    if(!sky||response.status!==200||response.value.schema!=="tldr-sky-list-publications/v1")return null;
    const ledger=canonicalPublicationLedger(response.value.publications);
    const keys=reader.requiredInitialSkySourceKeys(sky,ledger) as string[];
    timings.push(`selection_ready;dur=${(performance.now()-started).toFixed(1)}`);
    const selected=new Set(keys);
    return {keys,responses:timed("selected_rows",readBatches(ledger.filter(row=>row.state==="live"&&row.row_id&&selected.has(row.content_key)&&!sharedSourceKey(row.content_key))))};
  });
  void selectedRows.then(value=>value?.responses.catch(()=>{})).catch(()=>{});
  let calculationMode = "worker";
  const calculated = await timed("sky", calculateInitialSky(req.url!,resolveSelection).catch(() => {
    resolveSelection(null);
    calculationMode = "inline-recovery";
    return readPublic(skyHandler, { method: "GET", url: req.url, headers: {} });
  }));
  resolveSelection(calculated.status === 200 ? calculated.value.sky : null);
  res.setHeader("x-sky-calculation-mode", calculationMode);
  if (calculated.status !== 200) { res.statusCode = calculated.status; res.end(JSON.stringify(calculated.value)); return; }
  const sky = calculated.value.sky as SkySnapshot;
  let initialReader: unknown = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const assembly = (async () => {
    const ledgerResponse = await publications;
    if (ledgerResponse.status !== 200 || ledgerResponse.value.schema !== "tldr-sky-list-publications/v1") throw new Error("Sky lifecycle unavailable.");
    const ledger = canonicalPublicationLedger(ledgerResponse.value.publications);
    const byKey = new Map(ledger.map(row => [row.content_key, row]));
    const { renderInitialSkyReader, requiredInitialSkySourceKeys } = await renderer;
    const lunationKeys = sky.moonEvent ? lunationReaderContentKeys({ startsAt: sky.moonEvent.occursAt,
      sign: sky.moonEvent.sign, title: sky.moonEvent.name }) : [];
    const sharedKey = (key: string) => sharedSourceKey(key) || lunationKeys.includes(key);
    const requiredKeys = new Set<string>(requiredInitialSkySourceKeys(sky, ledger));
    const current = ledger.filter(row => row.state === "live" && row.row_id && (requiredKeys.has(row.content_key) || sharedKey(row.content_key)));
    const early = await earlyRows;
    const selected = await selectedRows;
    if(selected && JSON.stringify([...requiredKeys].sort())!==JSON.stringify([...selected.keys].sort()))throw new Error("Sky source selection changed during calculation.");
    const prefetched = selected ? await selected.responses : [];
    const prefetchedKeys = new Set(selected?.keys.filter(key=>!sharedSourceKey(key)));
    const responses = (await Promise.all([early.responses,
      timed("rows", readBatches(current.filter(row => !early.keys.has(row.content_key)&&!prefetchedKeys.has(row.content_key))))])).flat().concat(prefetched);
    if (responses.some(response => response.status !== 200 || response.value.schema !== "content-reader-row-v1"
      || response.value.nextCursor !== null || !Array.isArray(response.value.rows))) throw new Error(`Sky reader rows unavailable (${responses.map(response => `${response.status}:${response.value.error ?? response.value.schema}`).join(", ")}).`);
    const rows = responses.flatMap(response => response.value.rows) as GeneratedContentRow[];
    if (rows.some(row => !publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date, byKey))) throw new Error("Sky source revision changed.");
    const previews = await timed("render", renderInitialSkyReader(sky, rows, ledger));
    const sources = rows.filter(row => sharedKey(row.content_key));
    const digest = createHash("sha256").update(JSON.stringify([sky, previews, ledger, sources])).digest("hex");
    return { schema: "tldr-initial-sky-reader/v1", previews, publications: ledger,
      publicationTag: await publicationLedgerTag(ledger), sources, digest };
    })();
    // Optional assembly cannot consume the existing eight-second facts deadline.
    // Failure returns verified facts and leaves ordinary source readiness intact.
    initialReader = await Promise.race([assembly, new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Initial assembly deadline exceeded.")),
        Math.max(1, assemblyTimeoutMs - (performance.now() - started)));
    })]);
  } catch (error) {
    console.warn("Initial Sky assembly unavailable; the normal source loader remains required.", error instanceof Error ? error.message : "Unknown source error.");
  } finally {
    clearTimeout(timeout);
  }
  res.setHeader("server-timing", timings.join(", "));
  res.statusCode = 200;
  res.end(JSON.stringify({ sky, initialReader }));
}
}
export default createInitialSkyReaderHandler();
