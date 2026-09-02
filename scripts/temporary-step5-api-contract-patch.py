from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    return text.replace(old, new, 1)

# prepopulate-content.ts
path = Path("api/admin/prepopulate-content.ts")
text = path.read_text()
text = replace_once(
    text,
    'import { isContentAdminAuthorized } from "../_lib/admin-auth.js";\n',
    'import { isContentAdminAuthorized } from "../_lib/admin-auth.js";\nimport { AdminHttpError, adminErrorMessage, adminErrorStatus, adminFetch, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";\n',
    "prepopulate import",
)
text = replace_once(
    text,
    'const sampleSurfaces = new Set<GeneratedContentSurface>(["you", "natal", "synastry", "composite", "relationship"]);\n',
    'const sampleSurfaces = new Set<GeneratedContentSurface>(["you", "natal", "synastry", "composite", "relationship"]);\nconst allowedQueueSurfaces = new Set<GeneratedContentSurface | "all">(["sky", "you", "natal", "synastry", "composite", "relationship", "modifier", "all"]);\n',
    "prepopulate surfaces",
)
old_helpers = '''function sendJson(res: ServerResponse, status: number, body: unknown) {\n  res.statusCode = status;\n  res.setHeader("content-type", "application/json");\n  res.end(JSON.stringify(body));\n}\n\nasync function readJsonBody(req: IncomingMessage) {\n  const chunks: Buffer[] = [];\n\n  for await (const chunk of req) {\n    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));\n  }\n\n  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as QueueInput;\n}\n\n'''
text = replace_once(text, old_helpers, "", "prepopulate helpers")
old_date = '''function dateFromInput(value?: string) {\n  if (!value) {\n    return new Date();\n  }\n\n  const date = new Date(`${value}T12:00:00.000Z`);\n\n  if (Number.isNaN(date.getTime())) {\n    throw new Error("targetDate must be YYYY-MM-DD.");\n  }\n\n  return date;\n}\n'''
new_date = '''function dateFromInput(value?: string) {\n  if (!value) return new Date();\n  if (!/^\\d{4}-\\d{2}-\\d{2}$/u.test(value)) throw new AdminHttpError(400, "targetDate must be YYYY-MM-DD.");\n  const date = new Date(`${value}T12:00:00.000Z`);\n  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {\n    throw new AdminHttpError(400, "targetDate must be a valid YYYY-MM-DD date.");\n  }\n  return date;\n}\n'''
text = replace_once(text, old_date, new_date, "prepopulate date")
text = text.replace("await fetch(", "await adminFetch(")
old_handler = '''export default async function handler(req: IncomingMessage, res: ServerResponse) {\n  if (req.method !== "POST") {\n    sendJson(res, 405, { error: "Use POST." });\n    return;\n  }\n\n  if (!await isContentAdminAuthorized(req)) {\n    sendJson(res, 401, { error: "Unauthorized." });\n    return;\n  }\n\n  try {\n    const input = await readJsonBody(req);\n\n    const date = dateFromInput(input.targetDate);\n    const targetDate = dateOnly(date);\n    const requestedSurface = input.surface ?? "sky";\n    let rows: QueueRow[] = [];\n'''
new_handler = '''export default async function handler(req: IncomingMessage, res: ServerResponse) {\n  if (!await isContentAdminAuthorized(req)) {\n    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });\n    return;\n  }\n  if (req.method !== "POST") {\n    sendAdminMethodNotAllowed(res, ["POST"]);\n    return;\n  }\n\n  try {\n    const input = await readAdminJsonBody<QueueInput>(req);\n    const date = dateFromInput(input.targetDate);\n    const targetDate = dateOnly(date);\n    const requestedSurface = input.surface ?? "sky";\n    if (!allowedQueueSurfaces.has(requestedSurface)) throw new AdminHttpError(400, "surface is not supported.");\n    let rows: QueueRow[] = [];\n'''
text = replace_once(text, old_handler, new_handler, "prepopulate handler start")
text = text.replace("    sendJson(res, 200, {", "    sendAdminJson(res, 200, {", 1)
old_catch = '''  } catch (error) {\n    sendJson(res, 500, {\n      ok: false,\n      error: error instanceof Error ? error.message : "Unknown queue pre-population error."\n    });\n  }\n}\n'''
new_catch = '''  } catch (error) {\n    sendAdminJson(res, adminErrorStatus(error), {\n      ok: false,\n      error: adminErrorMessage(error, "Unknown queue pre-population error.")\n    });\n  }\n}\n'''
text = replace_once(text, old_catch, new_catch, "prepopulate catch")
path.write_text(text)

# natal-placement-preview.ts
path = Path("api/admin/natal-placement-preview.ts")
text = path.read_text()
text = replace_once(
    text,
    'import { isContentAdminAuthorized } from "../_lib/admin-auth.js";\n',
    'import { isContentAdminAuthorized } from "../_lib/admin-auth.js";\nimport { AdminHttpError, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";\n',
    "natal preview import",
)
old = '''function sendJson(res: ServerResponse, status: number, body: unknown) {\n  res.statusCode = status;\n  res.setHeader("content-type", "application/json");\n  res.setHeader("cache-control", "private, no-store");\n  res.end(JSON.stringify(body));\n}\n\nasync function readJsonBody(req: IncomingMessage) {\n  const chunks: Buffer[] = [];\n  let size = 0;\n  for await (const chunk of req) {\n    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);\n    size += bytes.length;\n    if (size > 512_000) throw new Error("Preview request is too large.");\n    chunks.push(bytes);\n  }\n  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;\n}\n\n'''
text = replace_once(text, old, "", "natal preview helpers")
old = '''export default async function handler(req: IncomingMessage, res: ServerResponse) {\n  if (!await isContentAdminAuthorized(req)) {\n    sendJson(res, 401, { ok: false, error: "Unauthorized." });\n    return;\n  }\n  if (req.method !== "POST") {\n    sendJson(res, 405, { ok: false, error: "Use POST." });\n    return;\n  }\n  try {\n    const state = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(await readJsonBody(req)));\n    sendJson(res, 200, { ok: true, ...state });\n  } catch (error) {\n    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : "The reader preview could not be assembled." });\n  }\n}\n'''
new = '''export default async function handler(req: IncomingMessage, res: ServerResponse) {\n  if (!await isContentAdminAuthorized(req)) {\n    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });\n    return;\n  }\n  if (req.method !== "POST") {\n    sendAdminMethodNotAllowed(res, ["POST"]);\n    return;\n  }\n  try {\n    const state = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(await readAdminJsonBody<unknown>(req, 512_000)));\n    sendAdminJson(res, 200, { ok: true, ...state });\n  } catch (error) {\n    const status = error instanceof AdminHttpError ? error.statusCode : 400;\n    sendAdminJson(res, status, { ok: false, error: error instanceof Error ? error.message : "The reader preview could not be assembled." });\n  }\n}\n'''
text = replace_once(text, old, new, "natal preview handler")
path.write_text(text)

# sky-v4-preview.ts
path = Path("api/admin/sky-v4-preview.ts")
text = path.read_text()
text = replace_once(
    text,
    'import { isContentAdminAuthorized } from "../_lib/admin-auth.js";\n',
    'import { isContentAdminAuthorized } from "../_lib/admin-auth.js";\nimport { AdminHttpError, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";\n',
    "sky v4 preview import",
)
old = '''function sendJson(res: ServerResponse, status: number, body: unknown) {\n  res.statusCode = status;\n  res.setHeader("content-type", "application/json");\n  res.setHeader("cache-control", "private, no-store");\n  res.end(JSON.stringify(body));\n}\n\nasync function readJsonBody(req: IncomingMessage) {\n  const chunks: Buffer[] = [];\n  let size = 0;\n  for await (const chunk of req) {\n    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);\n    size += bytes.length;\n    if (size > 1_000_000) throw new Error("Preview request is too large.");\n    chunks.push(bytes);\n  }\n  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;\n}\n\n'''
text = replace_once(text, old, "", "sky v4 preview helpers")
text = text.replace("sendJson(res, 401", "sendAdminJson(res, 401", 1)
text = replace_once(text, '''  if (req.method !== "POST") {\n    sendJson(res, 405, { ok: false, error: "Use POST." });\n    return;\n  }\n''', '''  if (req.method !== "POST") {\n    sendAdminMethodNotAllowed(res, ["POST"]);\n    return;\n  }\n''', "sky v4 method")
text = text.replace("normalizeSkyV4PreviewInput(await readJsonBody(req))", "normalizeSkyV4PreviewInput(await readAdminJsonBody<unknown>(req, 1_000_000))", 1)
text = text.replace("    sendJson(res, 200, { ok: true, rendered });", "    sendAdminJson(res, 200, { ok: true, rendered });", 1)
text = replace_once(text, '''  } catch (error) {\n    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : "The SKY V4 preview could not be assembled." });\n  }\n}\n''', '''  } catch (error) {\n    const status = error instanceof AdminHttpError ? error.statusCode : 400;\n    sendAdminJson(res, status, { ok: false, error: error instanceof Error ? error.message : "The SKY V4 preview could not be assembled." });\n  }\n}\n''', "sky v4 catch")
path.write_text(text)

# review-records.ts
path = Path("api/admin/review-records.ts")
text = path.read_text()
text = replace_once(
    text,
    'import { isContentAdminAuthorized } from "../_lib/admin-auth.js";\n',
    'import { isContentAdminAuthorized } from "../_lib/admin-auth.js";\nimport { AdminHttpError, adminErrorMessage, adminErrorStatus, adminFetch, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";\n',
    "review records import",
)
old = '''function sendJson(res: ServerResponse, status: number, body: unknown) {\n  res.statusCode = status;\n  res.setHeader("content-type", "application/json");\n  res.end(JSON.stringify(body));\n}\n\n'''
text = replace_once(text, old, "", "review records sendJson")
text = text.replace("await fetch(", "await adminFetch(")
text = text.replace('throw new Error("Dates must be YYYY-MM-DD.");', 'throw new AdminHttpError(400, "Dates must be YYYY-MM-DD.");')
text = text.replace('throw new Error(`Unknown IANA timezone: ${value}`);', 'throw new AdminHttpError(400, `Unknown IANA timezone: ${value}`);')
text = text.replace('sendJson(res, 401, { error: "Unauthorized." });', 'sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });', 1)
text = replace_once(text, '''  if (req.method !== "GET") {\n    sendJson(res, 405, { error: "Use GET." });\n    return;\n  }\n''', '''  if (req.method !== "GET") {\n    sendAdminMethodNotAllowed(res, ["GET"]);\n    return;\n  }\n''', "review records method")
needle = '''    const requestUrl = new URL(req.url ?? "/api/admin/review-records", "http://localhost");\n    const surface = (requestUrl.searchParams.get("surface") ?? "upcomingAspects") as ReviewSurface;\n    const status = requestUrl.searchParams.get("status");\n'''
replacement = '''    const requestUrl = new URL(req.url ?? "/api/admin/review-records", "http://localhost");\n    const surface = (requestUrl.searchParams.get("surface") ?? "upcomingAspects") as ReviewSurface;\n    const status = requestUrl.searchParams.get("status");\n    if (!["upcomingAspects", "transitNatal", "natalChart", "relationshipLayer", "dailyGlance"].includes(surface)) {\n      throw new AdminHttpError(400, "surface is not supported.");\n    }\n    if (status && status !== "all" && !["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"].includes(status)) {\n      throw new AdminHttpError(400, "status is not supported.");\n    }\n'''
text = replace_once(text, needle, replacement, "review records input validation")
text = text.replace("    sendJson(res, 200, {", "    sendAdminJson(res, 200, {", 1)
old = '''  } catch (error) {\n    sendJson(res, 500, {\n      ok: false,\n      error: error instanceof Error ? error.message : "Unknown review records admin error."\n    });\n  }\n}\n'''
new = '''  } catch (error) {\n    sendAdminJson(res, adminErrorStatus(error), {\n      ok: false,\n      error: adminErrorMessage(error, "Unknown review records admin error.")\n    });\n  }\n}\n'''
text = replace_once(text, old, new, "review records catch")
path.write_text(text)
