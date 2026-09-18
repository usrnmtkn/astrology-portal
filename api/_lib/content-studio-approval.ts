import { createHash } from "node:crypto";

// Called only for the authenticated owner's explicit publication action.
// Plain saves and proposed revisions must never acquire an approval receipt.
export function approveNatalAspectStudioCopy(record: Record<string, unknown>, contentKey: string) {
  if (
    !contentKey.startsWith("fallback-hook/natal-aspect-lived/")
    && !contentKey.startsWith("fallback-hook/synastry-pair/")
    && !contentKey.startsWith("authored/transit-aspect/")
    && !contentKey.startsWith("authored/transit-return/")
  ) return;
  const payload = { contentKey, headline: record.headline ?? null, summary: record.summary ?? null, body: record.body ?? null, body_you: record.body_you ?? null, body_they: record.body_they ?? null };
  record.approval = {
    approvalLevel: "exact_owner_approved",
    recordPath: `/api/admin/generated-content?contentKey=${encodeURIComponent(contentKey)}`,
    payloadSha256: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    approvedAt: new Date().toISOString(),
    action: "content-studio-publish"
  };
}
