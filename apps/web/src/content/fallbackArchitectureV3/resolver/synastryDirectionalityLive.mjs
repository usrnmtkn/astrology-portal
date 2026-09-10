export const SYNASTRY_DIRECTIONALITY_LIVE_SCHEMA = "synastry-directionality-live/v1";
export const SYNASTRY_DIRECTIONALITY_MODE = "viewer-centered-synastry-v1";
const SYNASTRY_PAIR_PREFIX = "fallback-hook/synastry-pair/";

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function unique(values) {
  return [...new Set(values.filter(nonEmptyString))];
}

function fail(message) {
  throw new Error(`Synastry directionality live overlay: ${message}`);
}

export function applySynastryDirectionalityLiveV1(baseRows, overlay) {
  if (!Array.isArray(baseRows)) fail("base rows must be an array");
  if (!overlay || overlay.schema !== SYNASTRY_DIRECTIONALITY_LIVE_SCHEMA) {
    fail(`expected schema ${SYNASTRY_DIRECTIONALITY_LIVE_SCHEMA}`);
  }
  if (overlay.directionality_mode !== SYNASTRY_DIRECTIONALITY_MODE) {
    fail(`expected directionality mode ${SYNASTRY_DIRECTIONALITY_MODE}`);
  }
  if (!nonEmptyString(overlay.approval_record)) fail("approval_record is required");
  if (!nonEmptyString(overlay.serving_authorized_at)) fail("serving_authorized_at is required");

  const patches = Array.isArray(overlay.rows) ? overlay.rows : [];
  if (patches.length === 0) fail("at least one patch row is required");

  const patchKeys = new Set();
  for (const patch of patches) {
    if (!nonEmptyString(patch?.contentKey) || !patch.contentKey.startsWith(SYNASTRY_PAIR_PREFIX)) {
      fail(`invalid contentKey ${String(patch?.contentKey ?? "")}`);
    }
    if (patchKeys.has(patch.contentKey)) fail(`duplicate patch ${patch.contentKey}`);
    patchKeys.add(patch.contentKey);
    if (Object.prototype.hasOwnProperty.call(patch, "body_they")) {
      fail(`${patch.contentKey} must not overwrite the historical body_they`);
    }
    if (!nonEmptyString(patch.body_you)) fail(`${patch.contentKey} body_you is required`);
    if (patch.body_you.includes("{{Name}}")) {
      fail(`${patch.contentKey} must use runtime holder variables, not {{Name}}`);
    }
    if (!nonEmptyString(patch.existingSemanticDirection) || !nonEmptyString(patch.missingSemanticDirection)) {
      fail(`${patch.contentKey} must declare both semantic directions`);
    }
    if (patch.existingSemanticDirection === patch.missingSemanticDirection) {
      fail(`${patch.contentKey} semantic directions must differ`);
    }
  }

  const indexesByKey = new Map();
  for (const [index, row] of baseRows.entries()) {
    if (!nonEmptyString(row?.contentKey)) continue;
    const indexes = indexesByKey.get(row.contentKey) ?? [];
    indexes.push(index);
    indexesByKey.set(row.contentKey, indexes);
  }

  const output = [...baseRows];
  for (const patch of patches) {
    const indexes = indexesByKey.get(patch.contentKey) ?? [];
    if (indexes.length !== 1) {
      fail(`${patch.contentKey} must match exactly one canonical base row; found ${indexes.length}`);
    }

    const index = indexes[0];
    const base = output[index];

    // A generated relationship partition may already contain this release. Keep
    // the merger idempotent so the checked-in overlay can remain the authority
    // after the generated bundle is refreshed.
    if (base.directionality_mode === SYNASTRY_DIRECTIONALITY_MODE) {
      if (
        base.body_you !== patch.body_you
        || base.body_you_semantic_direction !== patch.missingSemanticDirection
        || base.body_they_semantic_direction !== patch.existingSemanticDirection
      ) {
        fail(`${patch.contentKey} already carries a different viewer-centered release`);
      }
      continue;
    }

    if (!nonEmptyString(base.body_they)) {
      fail(`${patch.contentKey} canonical base row is missing body_they`);
    }

    const priorApproval = base.approval;
    const priorReviewStatus = base.review_status ?? null;
    const priorApprovedVia = base.approved_via ?? null;
    const {
      approval: _staleWholeRowApproval,
      ...baseWithoutStaleApproval
    } = base;

    output[index] = {
      ...baseWithoutStaleApproval,
      body_you: patch.body_you,
      body_they: base.body_they,
      review_status: "approved",
      approval: {
        approvalLevel: "owner_signoff_untraced",
        approvedAt: overlay.serving_authorized_at
      },
      approved_via: `owner-approved viewer-centered reverse; ${overlay.approval_record}`,
      directionality_mode: SYNASTRY_DIRECTIONALITY_MODE,
      directionality_release_id: overlay.release_id,
      body_you_semantic_direction: patch.missingSemanticDirection,
      body_they_semantic_direction: patch.existingSemanticDirection,
      body_you_approval: {
        approvalLevel: "exact_owner_approved",
        approvedAt: overlay.approved_at,
        servingAuthorizedAt: overlay.serving_authorized_at,
        recordPath: overlay.approval_record
      },
      body_they_review_status: priorReviewStatus,
      ...(priorApprovedVia ? { body_they_prior_approved_via: priorApprovedVia } : {}),
      ...(priorApproval ? { body_they_prior_row_approval: priorApproval } : {}),
      source_keys: unique([
        ...(Array.isArray(base.source_keys) ? base.source_keys : []),
        overlay.approval_record,
        "apps/web/src/content/fallbackArchitectureV3/source-rows/synastry-directionality-live-v1.json"
      ])
    };
  }

  return output;
}
