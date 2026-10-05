import assert from "node:assert/strict";
import { Readable } from "node:stream";
import fs from "node:fs";

process.env.CONTENT_GENERATION_SECRET = "bond-writer-fixture";
process.env.SUPABASE_URL = "https://bond-writer.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture";
process.env.OPENAI_API_KEY = "fixture";
const { default: handler } = await import("../api/admin/personal-transit-writing.ts");
const source = JSON.parse(fs.readFileSync("packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json", "utf8"));
const owner = source.entries.filter((entry: any) => entry.ownerAuthored && entry.useAsPositiveVoiceEvidence && entry.surface === "relationship-astrology");
let calls = 0;
let currentKey = "";
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: any, init: any = {}) => {
  const url = new URL(String(input?.url ?? input));
  if (url.hostname === "api.openai.com") {
    calls++;
    const request = JSON.parse(init.body);
    assert.match(request.input, /GOVERNED KNOWLEDGE EVIDENCE/u);
    assert.match(request.input, /EXISTING AUDIENCE COPY TO REVISE ONLY AS DIRECTED/u);
    assert.match(request.input, /Between You Two naming rule/u);
    assert.match(request.input, /Use singular verb agreement after the name/u);
    assert.doesNotMatch(request.input, /The template's fixed prose is immutable/u);
    assert(owner.filter((entry: any) => request.input.includes(entry.text)).length >= 3, "Complete owner relationship passages must reach the provider");
    assert.match(request.input, currentKey.includes("north-node") ? /body\/north_node/u : /body\/chiron/u);
    return Response.json({ id: "resp_bond_fixture", output_text: JSON.stringify({ slotValues: { youDraft: "{{holder1}} provides synthetic reader fixture copy.", friendDraft: "You provide synthetic friend fixture copy to {{holder1}}." } }) });
  }
  assert.equal(init.method ?? "GET", "GET", "Generation must never write saved content");
  return Response.json([]);
};
async function invoke(secret: string) {
  const req: any = Readable.from([JSON.stringify({ action: "generate", contentKey: currentKey, youText: "Existing synthetic reader copy.", friendText: "Existing synthetic friend copy.", instruction: "Repair the unclear interaction.", audience: "both", provider: "openai" })]);
  req.method = "POST";
  req.headers = { "x-content-generation-secret": secret };
  let status = 0;
  let payload: any;
  const res: any = { setHeader() {}, get statusCode() { return status; }, set statusCode(value) { status = value; }, end(value: string) { payload = JSON.parse(value); } };
  await handler(req, res);
  return { status, payload };
}
try {
  for (currentKey of ["fallback-hook/bond-effect-conjunction/chiron", "fallback-hook/bond-effect-hard/north-node/variant-3"]) {
    const result = await invoke("bond-writer-fixture");
    assert.equal(result.status, 200, JSON.stringify(result.payload));
    assert.equal(result.payload.contentKey, currentKey);
    assert.equal(result.payload.saved, false);
    assert.equal(result.payload.published, false);
    assert.equal(result.payload.approved, false);
    assert.equal(result.payload.youDraft, "{{holder1}} provides synthetic reader fixture copy.");
  }
  assert.equal(calls, 2);
  assert.equal((await invoke("invalid")).status, 401);
  assert.equal(calls, 2);
  console.log("PASS actual bond writer handler: exact and grouped aspects, governed meaning, full owner evidence, name agreement, no save/publish, and authorization.");
} finally { globalThis.fetch = originalFetch; }
