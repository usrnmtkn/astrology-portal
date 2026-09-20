#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const envPath = path.join(repoRoot, "apps/web/.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    const quote = value[0];
    if ((quote === "\"" || quote === "'") && value.endsWith(quote)) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const secret = process.env.CONTENT_GENERATION_SECRET?.trim();
if (!secret) throw new Error("CONTENT_GENERATION_SECRET is not configured.");

const authorization = JSON.parse(fs.readFileSync(new URL("./owner-authorization.json", import.meta.url), "utf8"));
const summary = authorization.payload.summary;
const body = authorization.payload.body;
const apiRoot = (process.env.CONTENT_STUDIO_API_ROOT ?? "https://tldrastro.vercel.app").replace(/\/$/u, "");

async function admin(method, urlPath, payload) {
  const response = await fetch(`${apiRoot}${urlPath}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-content-generation-secret": secret
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 300) }; }
  return { status: response.status, parsed };
}

function rowsFrom(payload) {
  return [payload.row, ...(payload.rows ?? []), ...(payload.records ?? [])].filter((item) => item?.id);
}

const liveListed = await admin("GET", `/api/admin/generated-content?contentKey=${encodeURIComponent(authorization.contentKey)}&status=LIVE&limit=5`);
if (liveListed.status !== 200) throw new Error(`Live lookup failed: ${liveListed.status}`);
const live = rowsFrom(liveListed.parsed).find((item) => item.content_key === authorization.contentKey && item.status === "LIVE");
if (!live?.id) throw new Error("Moon sextile Lilith live Studio row was not found.");

const draftListed = await admin("GET", `/api/admin/generated-content?contentKey=${encodeURIComponent(authorization.contentKey)}&status=DRAFT&limit=10`);
let draft = rowsFrom(draftListed.parsed).find((item) => item.mode === "studio-draft" && item.sections?.packageDraft?.Body === body);

if (!draft?.id) {
  const saved = await admin("PATCH", "/api/admin/generated-content", {
    id: live.id,
    expectedUpdatedAt: live.updated_at,
    sections: {
      ...live.sections,
      packageDraft: {
        ...(live.sections?.packageRecord ?? {}),
        Summary: summary,
        Body: body
      }
    },
    reviewStatus: "needs_review"
  });
  if (saved.status !== 200) throw new Error(`Draft save failed: ${saved.status} ${JSON.stringify(saved.parsed)}`);
  draft = saved.parsed.row ?? saved.parsed;
}

if (!draft?.id || draft.id === live.id) throw new Error("Studio did not fork a copy revision.");

const published = await admin("PATCH", "/api/admin/generated-content", {
  id: draft.id,
  expectedUpdatedAt: draft.updated_at,
  ownerAction: "approve-package-revision"
});
if (published.status !== 200) throw new Error(`Sign Off failed: ${published.status} ${JSON.stringify(published.parsed)}`);

const publishedRow = published.parsed.row ?? published.parsed;
if (publishedRow.body !== body) throw new Error("Published body did not match the owner replacement.");
console.log(JSON.stringify({
  ok: true,
  id: publishedRow.id,
  contentKey: publishedRow.content_key,
  status: publishedRow.status,
  lane: publishedRow.lane,
  reviewState: publishedRow.review_state ?? null,
  bodySha256: authorization.bodySha256
}));
