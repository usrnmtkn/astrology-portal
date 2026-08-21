import { assertCanonicalUnitId } from "./unit-id.mjs";

const RENDERABLE_APPROVAL_STATES = new Set(["approved", "approved_reuse", "reviewed"]);
const VALID_PERSPECTIVES = new Set(["you", "they"]);

function clone(value) {
  return structuredClone(value);
}

export function createCanonicalContentResolver(index) {
  if (!index || index.schema !== "tldr-astro-canonical-content-index/v1" || !Array.isArray(index.units)) {
    throw new Error("Invalid canonical content index.");
  }

  const units = new Map();
  const contentBlobs = new Map((index.contentBlobs ?? []).map((blob) => [blob.contentSha256, blob.byPerspective]));
  const conflictedSlotIds = new Set(
    (index.slots ?? [])
      .filter((slot) => slot.reconciliationBucket === "OWNER_DECISION_REQUIRED")
      .map((slot) => slot.slotId),
  );
  for (const unit of index.units) {
    assertCanonicalUnitId(unit.identity?.unitId);
    if (units.has(unit.identity.unitId)) {
      throw new Error(`ONE_AUTHORITY_PER_UNIT violated: ${unit.identity.unitId}`);
    }
    units.set(unit.identity.unitId, unit);
  }

  return function getCanonicalUnit(unitId, options = {}) {
    assertCanonicalUnitId(unitId);
    const unit = units.get(unitId);
    if (!unit) return null;

    const expectedSurface = options.surface;
    const expectedRegister = options.register;
    const perspective = options.perspective;
    if (expectedSurface && unit.identity.surface !== expectedSurface) {
      throw new Error(`SURFACE_MISMATCH: ${unitId} is ${unit.identity.surface}, not ${expectedSurface}`);
    }
    if (expectedRegister && unit.identity.register !== expectedRegister) {
      throw new Error(`REGISTER_MISMATCH: ${unitId} is ${unit.identity.register}, not ${expectedRegister}`);
    }
    if (perspective) {
      if (!VALID_PERSPECTIVES.has(perspective) || !unit.identity.supportedPerspectives.includes(perspective)) {
        throw new Error(`PERSPECTIVE_MISMATCH: ${unitId} does not support ${perspective}`);
      }
    }

    if (unit.resolution.mode === "gap") {
      return clone({ ...unit, result: { status: "SOURCE_GAP", renderEligible: false } });
    }
    if (
      unit.reconciliation?.bucket === "OWNER_DECISION_REQUIRED"
      || unit.resolution.canonicalSlotIds?.some((slotId) => conflictedSlotIds.has(slotId))
    ) {
      return clone({ ...unit, result: { status: "OWNER_DECISION_REQUIRED", renderEligible: false } });
    }
    if (perspective && unit.resolution.perspectiveModes?.[perspective] === "gap") {
      return clone({
        ...unit,
        content: { ...unit.content, byPerspective: {} },
        result: { status: "SOURCE_GAP", renderEligible: false }
      });
    }

    const revision = unit.revisions.find((candidate) => candidate.revisionId === unit.resolution.canonicalRevisionId);
    if (!revision) {
      throw new Error(`REVISION_HISTORY_INTACT violated: ${unitId}`);
    }
    if (!RENDERABLE_APPROVAL_STATES.has(unit.governance.approvalState) || unit.content.renderEligible !== true) {
      return clone({ ...unit, result: { status: "NOT_RENDERABLE", renderEligible: false } });
    }

    const byPerspective = contentBlobs.get(unit.content.contentRef);
    if (!byPerspective) {
      throw new Error(`CONTENT_BLOB_MISSING: ${unitId} -> ${unit.content.contentRef}`);
    }
    const content = perspective ? { [perspective]: byPerspective[perspective] } : byPerspective;
    return clone({
      ...unit,
      content: { ...unit.content, byPerspective: content },
      result: { status: "RESOLVED", renderEligible: true }
    });
  };
}

export function getCanonicalUnit(index, unitId, options) {
  return createCanonicalContentResolver(index)(unitId, options);
}
