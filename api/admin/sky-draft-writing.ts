import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { adminFetchJson, adminStorageRows, AdminHttpError, adminErrorStatus, adminErrorMessage, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { approvedStudioPairSources, studioStorage } from "../_lib/sky-studio-sources.js";
import { runStudioSkyWriting, studioSkyIdentity } from "../_lib/sky-studio-writing.js";
import { skyWritingIssues } from "../../apps/web/src/content/contentReviewReadiness.js";
loadLocalWebEnv();
export const maxDuration = 300;
function nextVersion(previous?: string) {
    return new Date(Math.max(Date.now(), (Date.parse(previous ?? "") || 0) + 1)).toISOString();
}
export default async function handler(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "POST")
        return sendAdminMethodNotAllowed(res, ["POST"]);
    if (!(await isContentAdminAuthorized(req)))
        return sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    try {
        const input = await readAdminJsonBody<Record<string, any>>(req);
        if (!input || typeof input !== "object" || Array.isArray(input) || !["generate", "recheck"].includes(input.action)
            || typeof input.contentKey !== "string" || Object.keys(input).some(k => !["action", "contentKey", "expectedUpdatedAt"].includes(k)))
            throw new AdminHttpError(400, "Choose Generate draft or Run writing checks for one saved identity.");
        const identity = studioSkyIdentity(input.contentKey);
        const { url, headers } = studioStorage();
        const lookup = new URLSearchParams({ content_key: `eq.${input.contentKey}`, mode: "eq.feed", target_date: "is.null", select: "*", limit: "1" });
        const read = await adminFetchJson(`${url}?${lookup}`, { headers });
        if (!read.ok)
            throw new AdminHttpError(502, "Could not read the draft. Retry.");
        const existing = adminStorageRows<Record<string, any>>(read.payload);
        if (!Array.isArray(existing))
            throw new AdminHttpError(502, "Invalid draft response.");
        let row = existing[0];
        if (row && (typeof input.expectedUpdatedAt !== "string" || row.updated_at !== input.expectedUpdatedAt))
            throw new AdminHttpError(409, "This draft changed. Reopen it before running writing checks or generation.");
        if (row && ["LIVE", "ARCHIVED"].includes(row.status))
            throw new AdminHttpError(409, "Open an editable draft before running writing checks.");
        if (input.action === "recheck" && !row?.body?.trim())
            throw new AdminHttpError(400, "Write and save the draft before running writing checks.");
        if (input.action === "generate" && row?.body?.trim())
            throw new AdminHttpError(409, "This draft already contains writing. Generation cannot replace it; edit the draft or run writing checks.");
        // Reserve the identity/version before paid work. Concurrent requests cannot duplicate or overwrite it.
        const now = nextVersion(row?.updated_at);
        const operation = { id: randomUUID(), action: input.action, startedAt: now };
        const snapshot = { ...(row?.source_snapshot ?? {}), studioWritingOperation: operation };
        if (snapshot.studioWritingOperation && row?.source_snapshot?.studioWritingOperation?.startedAt
            && Date.now() - Date.parse(row.source_snapshot.studioWritingOperation.startedAt) < 310000)
            throw new AdminHttpError(409, "Writing checks or generation are already running. Refresh this draft shortly.");
        const claim = row ? { source_snapshot: snapshot, updated_at: now } : {
            content_key: input.contentKey, surface: "sky", mode: "feed", target_date: null, status: "DRAFT", lane: "serving",
            block_type: identity.kind === "aspect" ? "sky_aspect" : "sky_placement", event_type: `collective-${identity.kind}-card`,
            review_state: "sky-voice-needs-review", source_snapshot: snapshot, facts: identity.args, body: "", summary: "",
            headline: (identity.kind === "aspect" ? `${identity.args.a} ${identity.args.aspect} ${identity.args.b}` : `${identity.args.planet} in ${identity.args.sign}`).replace(/\b[a-z]/g, letter => letter.toUpperCase()), provider: "manual-admin", prompt_version: "content-studio-sky-v1", updated_at: now
        };
        const params = row ? new URLSearchParams({ id: `eq.${row.id}`, updated_at: `eq.${row.updated_at}` }) : new URLSearchParams({ on_conflict: "content_key,target_date,mode" });
        const claimed = await adminFetchJson(`${url}?${params}`, { method: row ? "PATCH" : "POST", headers: { ...headers, prefer: row ? "return=representation" : "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(claim) });
        if (!claimed.ok)
            throw new AdminHttpError(502, "Could not start writing work. Refresh and retry.");
        const claimedRows = adminStorageRows<Record<string, any>>(claimed.payload);
        if (!Array.isArray(claimedRows) || !claimedRows[0])
            throw new AdminHttpError(409, "Another editor changed or created this draft. Refresh to see it.");
        if (claimedRows.length !== 1 || typeof claimedRows[0].id !== "string" || typeof claimedRows[0].updated_at !== "string" || claimedRows[0].content_key !== input.contentKey || (row && claimedRows[0].id !== row.id)) throw new AdminHttpError(502, "Storage did not confirm the draft reservation. Refresh before retrying.");
        row = claimedRows[0];
        const finish = async (patch: Record<string, unknown>) => {
            const result = await adminFetchJson(`${url}?${new URLSearchParams({ id: `eq.${row.id}`, updated_at: `eq.${row.updated_at}` })}`, { method: "PATCH", headers: { ...headers, prefer: "return=representation" }, body: JSON.stringify({ ...patch, updated_at: nextVersion(row.updated_at) }) });
            if (!result.ok)
                throw new AdminHttpError(502, "Could not save writing results. Refresh the draft before retrying.");
            const saved = adminStorageRows<Record<string, any>>(result.payload);
            if (!Array.isArray(saved) || !saved[0])
                throw new AdminHttpError(409, "The draft changed while writing work ran. Your newer text was preserved. Reopen it and run checks again.");
            if (saved.length !== 1 || saved[0].id !== row.id || typeof saved[0].updated_at !== "string") throw new AdminHttpError(502, "Storage did not confirm the saved writing results. Refresh before retrying.");
            return saved[0];
        };
        try {
            const pair = identity.kind === "aspect" ? `${identity.args.a}-${identity.args.b}` : "";
            const source = pair && input.action === "generate" ? (await approvedStudioPairSources()).get(pair) : undefined;
            const result = await runStudioSkyWriting(input.contentKey, input.action, row.body ?? "", source);
            const prefix = identity.kind === "aspect" ? "skyAspect" : "skyPlacement";
            const text = input.action === "recheck" ? row.body : result.text;
            const sourceSnapshot = { ...row.source_snapshot, studioWritingOperation: null, studioWritingError: null,
                [`${prefix}VoiceLint`]: result.lint, [`${prefix}Judge`]: result.judge,
                ...(identity.kind === "aspect" ? { cardFacts: identity.args, pairKey: pair, pairSource: input.action === "generate" ? result.facts?.pairSource ?? source?.path ?? "content-studio/manual" : row.source_snapshot?.pairSource ?? "content-studio/manual" } : {}),
                studioWritingCheck: { reviewPolicy: "owner-final-v1", contentKey: input.contentKey, checkedAt: new Date().toISOString(), bodyHash: createHash("sha256").update(text).digest("hex"), action: input.action },
                ...(source ? { studioPairSourceRevision: source.revision } : {}) };
            const patch = { status: "DRAFT", review_state: "sky-owner-approval-required", source_snapshot: sourceSnapshot,
                judge_score: result.judge?.score ?? null, judge_gate: "human-review", judge_verdict: result.lint?.score === 3 && result.lint?.fails === 0 ? "owner-review-pending" : "lint-failed",
                judge_why: "Automatic checks do not approve prose. Review the complete writing before publication.",
                ...(input.action === "generate" ? { body: text, provider: result.provider ?? "configured-writer", model: result.model ?? null } : {}) };
            const issues = skyWritingIssues({ ...row, ...patch, content_key: input.contentKey, body: text });
            if (issues.length)
                patch.review_state = "sky-voice-needs-review";
            const saved = await finish(patch);
            return sendAdminJson(res, 200, { ok: true, rows: [saved], issues });
        }
        catch (error) {
            if (!(error instanceof AdminHttpError && error.statusCode === 409 && error.message.startsWith("The draft changed"))) {
                await finish({ source_snapshot: { ...row.source_snapshot, studioWritingOperation: null, studioWritingError: adminErrorMessage(error, "Writing work failed. Retry.") } });
            }
            throw error;
        }
    }
    catch (error) {
        sendAdminJson(res, adminErrorStatus(error), { ok: false, error: adminErrorMessage(error, "Writing work failed. Your saved text is unchanged.") });
    }
}
