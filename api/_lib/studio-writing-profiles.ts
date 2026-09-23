import type { IncomingMessage } from "node:http";
import { createHash } from "node:crypto";
import { AdminHttpError, adminStorageRows, readAdminJsonBody } from "./admin-http.js";
import { defaultHoroscopeProfile, validateHoroscopeProfile, HOROSCOPE_PERIODS, HOROSCOPE_PROFILE_PREFIX, type HoroscopeProfile, type SavedHoroscopeProfile } from "../../src/astro-writing/horoscopeWritingProfiles.mjs";

type Storage = (params: URLSearchParams, options?: { method?: string; body?: string }) => Promise<{ ok: boolean; status: number; payload: unknown }>;
const hash = (profile: HoroscopeProfile) => createHash("sha256").update(JSON.stringify(profile)).digest("hex");
function decode(row: any): SavedHoroscopeProfile {
  let profile: HoroscopeProfile;
  try { profile = validateHoroscopeProfile(row.sections?.writingProfile); }
  catch { throw new AdminHttpError(502, "The saved writing profile is invalid. Reload before editing."); }
  if (row.content_key !== HOROSCOPE_PROFILE_PREFIX + profile.period || row.status !== "DRAFT" || row.lane !== "reference"
    || row.mode !== "article" || typeof row.id !== "string" || !row.id || typeof row.updated_at !== "string"
    || !Number.isFinite(Date.parse(row.updated_at)) || !Number.isInteger(row.source_snapshot?.writingProfileRevision)
    || row.source_snapshot.writingProfileRevision < 1) throw new AdminHttpError(502, "Storage returned an invalid writing profile.");
  return { profile, id: row.id, updatedAt: row.updated_at, revision: row.source_snapshot.writingProfileRevision, sha256: hash(profile) };
}

export async function listStudioWritingProfiles(storage: Storage) {
  const response = await storage(new URLSearchParams({ content_key: `like.${HOROSCOPE_PROFILE_PREFIX}*`, mode: "eq.article", target_date: "is.null", select: "*", limit: "4" }));
  if (!response.ok) throw new AdminHttpError(502, "Writing profiles could not be loaded. Try again.");
  const rows = adminStorageRows(response.payload).map(decode);
  if (new Set(rows.map(row => row.profile.period)).size !== rows.length) throw new AdminHttpError(502, "Conflicting writing profiles need review.");
  return HOROSCOPE_PERIODS.map(period => rows.find(row => row.profile.period === period) ?? {
    profile: defaultHoroscopeProfile(period), id: null, updatedAt: null, revision: 0, sha256: hash(defaultHoroscopeProfile(period))
  });
}

export async function handleStudioWritingProfiles(req: IncomingMessage, storage: Storage) {
  if (req.method === "GET") return { ok: true, profiles: await listStudioWritingProfiles(storage) };
  if (req.method !== "POST") throw new AdminHttpError(405, "Use GET or POST for writing profiles.");
  const body = await readAdminJsonBody<{ profile: unknown; expectedUpdatedAt: string | null }>(req, 100000);
  if (Object.keys(body).some(key => !["profile", "expectedUpdatedAt"].includes(key)) || !("expectedUpdatedAt" in body)
    || body.expectedUpdatedAt !== null && typeof body.expectedUpdatedAt !== "string") throw new AdminHttpError(400, "Send a writing profile and its opened version.");
  let profile: HoroscopeProfile;
  try { profile = validateHoroscopeProfile(body.profile); } catch (error) { throw new AdminHttpError(400, (error as Error).message); }
  const saved = (await listStudioWritingProfiles(storage)).find(row => row.profile.period === profile.period)!;
  if (saved.updatedAt !== body.expectedUpdatedAt) throw new AdminHttpError(409, "This writing profile changed. Your edits are still here; reload the saved version before trying again.");
  const updatedAt = new Date(Math.max(Date.now(), (Date.parse(saved.updatedAt ?? "") || 0) + 1)).toISOString();
  const row = {
    content_key: HOROSCOPE_PROFILE_PREFIX + profile.period, surface: "sky", mode: "article", target_date: null,
    status: "DRAFT", lane: "reference", event_type: "studio-writing-profile", provider: "manual-admin", prompt_version: "horoscope-writing-profile-v1",
    headline: `${profile.period} horoscope writing`, body: "", summary: "", sections: { writingProfile: profile },
    source_snapshot: { writingProfileRevision: saved.revision + 1, previousProfileSha256: saved.id ? saved.sha256 : null }, updated_at: updatedAt
  };
  const params = saved.id ? new URLSearchParams({ id: `eq.${saved.id}`, content_key: `eq.${row.content_key}`, updated_at: `eq.${saved.updatedAt}`, status: "eq.DRAFT", lane: "eq.reference", mode: "eq.article" }) : new URLSearchParams();
  const result = await storage(params, { method: saved.id ? "PATCH" : "POST", body: JSON.stringify(row) });
  if (result.status === 409) throw new AdminHttpError(409, "Another editor saved this writing profile. Reload the saved version.");
  if (!result.ok) throw new AdminHttpError(502, "The save could not be confirmed. Your edits are still here; reload before retrying.");
  const rows = adminStorageRows(result.payload);
  if (!rows.length) throw new AdminHttpError(409, "This writing profile changed during the save. Reload the saved version.");
  if (rows.length !== 1) throw new AdminHttpError(502, "The writing profile save could not be confirmed.");
  const confirmed = decode(rows[0]);
  if (confirmed.profile.period !== profile.period || saved.id && confirmed.id !== saved.id || confirmed.revision !== saved.revision + 1
    || confirmed.sha256 !== hash(profile) || confirmed.updatedAt === saved.updatedAt) throw new AdminHttpError(502, "Storage did not confirm this exact writing profile. Reload before retrying.");
  return { ok: true, profile: confirmed };
}
