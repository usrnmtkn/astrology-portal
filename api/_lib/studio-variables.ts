import { assertCleanReaderCopy } from "../../apps/web/src/content/editorialCopyBoundary.mjs";
import type { IncomingMessage } from "node:http";
import { STUDIO_VARIABLE_PREFIX, STUDIO_VARIABLE_SCHEMA, validateStudioVariable, studioRecordVariableNames, resolveStudioVariableRecord } from "../../apps/web/src/content/studioCustomVariables.mjs";
import reservedNames from "../_generated/studio-variable-names.json" with { type: "json" };

type Storage = (params: URLSearchParams, options?: { method?: string; body?: string }) => Promise<{ ok: boolean; status: number; payload: any }>;
export class StudioVariableError extends Error {
  constructor(message: string, public statusCode = 400) { super(message); }
}
const asDefinition = (row: any) => ({ ...row.sections.variable, id: row.id, updatedAt: row.updated_at });

export async function listStudioVariables(storage: Storage, names?: string[]) {
  if (names && !names.length) return [];
  if (names && names.length > 100) throw new StudioVariableError("Use at most 100 custom variables in one record.");
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const response = await storage(new URLSearchParams({ select: "id,content_key,updated_at,sections", content_key: names ? `in.(${names.map(name => `${STUDIO_VARIABLE_PREFIX}${name.toLowerCase()}`).join(",")})` : `like.${STUDIO_VARIABLE_PREFIX}*`, mode: "eq.article", status: "eq.DRAFT", order: "id.asc", limit: "500", offset: String(offset) }));
    if (!response.ok || !Array.isArray(response.payload)) throw new StudioVariableError("Your variables could not be loaded. Try again.", 502);
    rows.push(...response.payload);
    if (response.payload.length < 500) break;
    if (rows.length >= 10000) throw new StudioVariableError("The variable library exceeded its supported size.", 413);
  }
  return rows.filter(row => row.sections?.variable?.schema === STUDIO_VARIABLE_SCHEMA).map(asDefinition);
}

async function readBody(req: IncomingMessage) {
  let body: any = (req as any).body;
  if (body === undefined) {
    const chunks: Buffer[] = []; let size = 0;
    for await (const part of req) { const chunk = Buffer.from(part); size += chunk.length; if (size > 2_000_000) throw new StudioVariableError("The variable is too large.", 413); chunks.push(chunk); }
    body = Buffer.concat(chunks).toString("utf8");
  }
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { throw new StudioVariableError("Send a valid JSON object."); } }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new StudioVariableError("Send a variable definition.");
  return body;
}

export async function handleStudioVariables(req: IncomingMessage, storage: Storage) {
  if (req.method === "GET") return { ok: true, variables: await listStudioVariables(storage) };
  if (!["POST", "PATCH", "DELETE"].includes(req.method ?? "")) throw new StudioVariableError("Use GET, POST, PATCH, or DELETE.", 405);
  const body = await readBody(req);
  const existing = await listStudioVariables(storage);
  const saved = body.id ? existing.find(item => item.id === body.id) : null;
  if (req.method !== "POST") {
    if (!saved) throw new StudioVariableError("This variable no longer exists. Reload the library.", 404);
    if (!body.expectedUpdatedAt || body.expectedUpdatedAt !== saved.updatedAt) throw new StudioVariableError("This variable changed after you opened it. Reload it before saving.", 409);
  }
  const params = new URLSearchParams();
  if (saved) { params.set("id", `eq.${saved.id}`); params.set("updated_at", `eq.${saved.updatedAt}`); params.set("content_key", `eq.${STUDIO_VARIABLE_PREFIX}${saved.name.toLowerCase()}`); params.set("status", "eq.DRAFT"); params.set("mode", "eq.article"); }
  if (req.method === "DELETE") {
    const response = await storage(params, { method: "DELETE" });
    if (!response.ok) throw new StudioVariableError("The variable could not be deleted. Try again.", 502);
    if (!Array.isArray(response.payload) || response.payload.length !== 1) throw new StudioVariableError("This variable changed while you were deleting it. Reload the library.", 409);
    return { ok: true, deletedId: saved.id };
  }
  let definition;
  try { definition = validateStudioVariable(body.variable, reservedNames); for (const value of [definition.value, ...definition.overrides.map(item => item.value)]) assertCleanReaderCopy({ body: value }); }
  catch (error) { throw new StudioVariableError(error instanceof Error ? error.message : "Invalid variable."); }
  if (existing.some(item => item.id !== saved?.id && item.name.toLowerCase() === definition.name.toLowerCase())) throw new StudioVariableError(`{{${definition.name}}} already exists. Choose a different token name.`, 409);
  const row = {
    content_key: `${STUDIO_VARIABLE_PREFIX}${definition.name.toLowerCase()}`, surface: "sky", mode: "article", target_date: null,
    status: "DRAFT", lane: "reference", event_type: "studio-variable", provider: "manual-admin", prompt_version: "studio-variable-v1",
    headline: definition.label, body: "", sections: { variable: definition },
    updated_at: new Date(Math.max(Date.now(), Date.parse(saved?.updatedAt ?? "") + 1 || 0)).toISOString()
  };
  const response = await storage(params, { method: req.method, body: JSON.stringify(row) });
  if (response.status === 409) throw new StudioVariableError("That token name is already taken. Choose a different name.", 409);
  if (!response.ok) throw new StudioVariableError("The variable could not be saved. Your edits are still here.", 502);
  if (!Array.isArray(response.payload) || response.payload.length !== 1) throw new StudioVariableError("The save could not be confirmed. Reload before trying again.", 409);
  return { ok: true, variable: asDefinition(response.payload[0]) };
}

/** Server-owned snapshots prevent edits or deletion in the library from changing approved copy. */
export async function snapshotStudioVariables(record: any, storage: Storage) {
  const names = studioRecordVariableNames(record);
  const old = Array.isArray(record._studioVariables) ? record._studioVariables : [];
  if (!names.some(name => !reservedNames.includes(name)) && !old.length) return record;
  const definitions = await listStudioVariables(storage, names.filter(name => !reservedNames.includes(name)));
  const bindings = names.filter(name => !reservedNames.includes(name)).map(name => {
    const definition = definitions.find(item => item.name === name);
    if (!definition && old.some((item: any) => item.name === name)) throw new StudioVariableError(`{{${name}}} was deleted or renamed. Update the token before saving this draft.`);
    // Editorial labels, descriptions and tags stay in the private library.
    return definition ? { id: definition.id, name: definition.name, value: definition.value, overrides: definition.overrides, updatedAt: definition.updatedAt } : undefined;
  }).filter(Boolean);
  return { ...record, _studioVariables: bindings };
}

export async function assertStudioVariablePublication(record: any, storage: Storage) {
  const saved = Array.isArray(record._studioVariables) ? record._studioVariables : [];
  if (!saved.length) return [];
  const current = await listStudioVariables(storage, saved.map((item: any) => item.name));
  for (const binding of saved) {
    const definition = current.find(item => item.id === binding.id && item.name === binding.name);
    if (!definition || JSON.stringify([definition.name, definition.value, definition.overrides]) !== JSON.stringify([binding.name, binding.value, binding.overrides])) throw new StudioVariableError(`{{${binding.name}}} changed or was deleted. Save and review this draft again before publishing.`, 409);
    if (!binding.value?.trim() || binding.overrides.some((item: any) => !item.value?.trim())) throw new StudioVariableError(`Complete the shared value and every override for {{${binding.name}}} before publishing.`);
  }
  resolveStudioVariableRecord(record);
  return current.map(item => ({ id: item.id as string, updatedAt: item.updatedAt as string }));
}
