import { createHash } from "node:crypto";
import { adminFetchJson, AdminHttpError, adminStorageRows } from "./admin-http.js";
import { studioStorage } from "./sky-studio-sources.js";
import { MONTHLY_TEMPLATE_KEY } from "../../src/content-studio/monthlyComposition.js";
export type CalendarStoredDocument = { id: string; content_key: string; updated_at: string; sections: { calendarPhraseDocument: unknown }; lane: string; status: string };
const permitted = (key: string) => key === MONTHLY_TEMPLATE_KEY || /^slot-template\/calendar\/monthly-composition-edition\/\d{4}-\d{2}\/[A-Za-z0-9%_+.-]+$/u.test(key);
const documentId = (key: string) => {
  const bytes = createHash("sha256").update(`calendar-phrase-document:${key}`).digest();
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
export async function readCalendarWritingDocument(key: string): Promise<CalendarStoredDocument | null> {
  if (!permitted(key)) throw new AdminHttpError(400, "Invalid Calendar writing document key.");
  const { url, headers } = studioStorage();
  const params = new URLSearchParams({ content_key: `eq.${key}`, select: "id,content_key,updated_at,sections,lane,status", limit: "2" });
  const result = await adminFetchJson(`${url}?${params}`, { headers });
  if (!result.ok) throw new AdminHttpError(503, "Calendar writing could not be loaded. Existing drafts have not been replaced.");
  const rows = adminStorageRows<CalendarStoredDocument>(result.payload);
  if (rows.length > 1 || rows.some(row => row.lane !== "reference" || !["DRAFT", "REVIEWED", "LIVE"].includes(row.status) || !row.updated_at || !row.sections?.calendarPhraseDocument)) throw new AdminHttpError(409, "The Calendar document needs a source review before it can be edited.");
  return rows[0] ?? null;
}
export async function saveCalendarWritingDocument(key: string, document: unknown, expectedUpdatedAt: string | null): Promise<CalendarStoredDocument> {
  if (!permitted(key)) throw new AdminHttpError(400, "Invalid Calendar writing document key.");
  if (expectedUpdatedAt !== null && (typeof expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(expectedUpdatedAt)))) throw new AdminHttpError(400, "A valid saved version is required.");
  const current = await readCalendarWritingDocument(key);
  if ((current?.updated_at ?? null) !== expectedUpdatedAt) throw new AdminHttpError(409, "This template or monthly draft changed. Reload before saving; the newer version was not overwritten.");
  const stamp = new Date(Math.max(Date.now(), expectedUpdatedAt ? Date.parse(expectedUpdatedAt) + 1 : 0)).toISOString();
  const row = { content_key: key, surface: "sky", mode: "article", event_type: "calendar-phrase-workspace", target_date: null,
    headline: key === MONTHLY_TEMPLATE_KEY ? "Monthly composition template" : "Monthly phrase draft", summary: null,
    body: "{{monthlyOverview}}\n\n{{seasonOverview}}", sections: { calendarPhraseDocument: document },
    status: "DRAFT", lane: "reference", review_state: null, updated_at: stamp,
    source_snapshot: { kind: "calendar-phrase-workspace", contentType: "template", content_role: "template", scope: "reference-only", publicationAuthorized: false }, provider: "manual", prompt_version: "calendar-phrases-v1" };
  const { url, headers } = studioStorage();
  const params = new URLSearchParams({ select: "id,content_key,updated_at,sections,lane,status" });
  if (current) { params.set("id", `eq.${current.id}`); params.set("updated_at", `eq.${expectedUpdatedAt}`); }
  const result = await adminFetchJson(`${url}?${params}`, { method: current ? "PATCH" : "POST",
    headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify(current ? row : { ...row, id: documentId(key) }) });
  if (!result.ok) {
    if (result.status === 409) throw new AdminHttpError(409, "Another editor saved this document. Reload before retrying.");
    throw new AdminHttpError(503, "Save was not confirmed. Reload to verify the stored draft before retrying; no automatic write retry was made.");
  }
  const saved = adminStorageRows<CalendarStoredDocument>(result.payload);
  if (saved.length !== 1) throw new AdminHttpError(409, "This Calendar document changed while saving. Reload before retrying.");
  return saved[0];
}
