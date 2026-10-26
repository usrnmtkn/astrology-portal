import { createHash } from "node:crypto";
import { isDynamicNatalPlacementExactKey } from "../../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.js";

// Called only for the authenticated owner's explicit publication action.
// Plain saves and proposed revisions must never acquire an approval receipt.
export function approveNatalAspectStudioCopy(record: Record<string, unknown>, contentKey: string) {
  if (isDynamicNatalPlacementExactKey(contentKey)) {
    if (typeof record.body_they === "string" && record.body_they.trim()) {
      const payloadSha256 = createHash("sha256").update(record.body_they).digest("hex");
      record.body_they_review_status = "approved";
      record.body_they_approval = {
        approvalLevel: "exact_owner_approved",
        recordPath: `/api/admin/generated-content?contentKey=${encodeURIComponent(contentKey)}`,
        payloadSha256,
        approvedAt: new Date().toISOString(),
        action: "content-studio-publish"
      };
    }
    return;
  }
  if (
    !contentKey.startsWith("fallback-hook/natal-aspect-lived/")
    && !contentKey.startsWith("fallback-hook/synastry-pair/")
    && !contentKey.startsWith("authored/transit-aspect/")
    && !contentKey.startsWith("authored/transit-return/")
  ) return;
  const payload = { contentKey, headline: record.headline ?? null, summary: record.summary ?? null, body: record.body ?? null, body_you: record.body_you ?? null, body_they: record.body_they ?? null, ...(record.alternate_copy_sha256 ? { alternate_copy_sha256: record.alternate_copy_sha256 } : {}) };
  record.approval = {
    approvalLevel: "exact_owner_approved",
    recordPath: `/api/admin/generated-content?contentKey=${encodeURIComponent(contentKey)}`,
    payloadSha256: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    approvedAt: new Date().toISOString(),
    action: "content-studio-publish"
  };
  if (contentKey.startsWith("authored/transit-aspect/")) for (const field of ["body_you", "body_they"]) {
    if (typeof record[field] !== "string") continue;
    record[`${field}_sha256`] = createHash("sha256").update(record[field] as string).digest("hex");
    record[`${field}_word_count`] = (record[field] as string).trim().split(/\s+/u).filter(Boolean).length;
    record[`${field}_review_status`] = "approved";
    record[`${field}_approval`] = { ...(record.approval as Record<string, unknown>), payloadSha256: record[`${field}_sha256`] };
  }
}
