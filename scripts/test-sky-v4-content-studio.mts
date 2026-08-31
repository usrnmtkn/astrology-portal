import assert from "node:assert/strict";
import fs from "node:fs";
import {
  applySkyV4ReaderFieldDraft,
  createSkyV4DraftVersion,
  rollbackSkyV4ServingVersion,
  skyV4EditableReaderFields,
  skyV4StudioDefinition,
  transitionSkyV4Version,
  validateSkyV4TransitPov,
  type SkyV4VersionedRecord
} from "../apps/admin/src/skyV4ContentStudio.ts";
import { renderSkyV4StudioPreview, skyV4ContentStudioRecords } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";

const corpus = JSON.parse(fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json", import.meta.url), "utf8"));
const records = skyV4ContentStudioRecords(corpus);
const executed = new Set<string>();

for (const row of records.filter((record: Record<string, unknown>) => record.studio_content_type === "continuous-placement")) {
  const result = validateSkyV4TransitPov("continuous-placement", skyV4EditableReaderFields(row));
  assert.equal(result.passed, true, `${String(row.contentKey)} failed transit POV: ${result.hardFailures.join(" ")}`);
}

const sourceFor = (contentKey: string) => {
  const source = records.find((row: Record<string, unknown>) => row.contentKey === contentKey);
  assert.ok(source, `Missing ${contentKey}`);
  return source;
};

const editOne = (contentKey: string, path: string, replacement: unknown, testId: string) => {
  const source = sourceFor(contentKey);
  const baseline = structuredClone(source.studio_source_baseline);
  const originalFields = skyV4EditableReaderFields(source);
  assert.ok(Object.hasOwn(originalFields, path), `${contentKey} does not expose ${path}`);
  const next = applySkyV4ReaderFieldDraft(source, { ...originalFields, [path]: replacement });
  assert.deepEqual(source.studio_source_baseline, baseline, `${contentKey} baseline mutated`);
  assert.equal(path.split(".").reduce<any>((current, part) => current?.[part], next), replacement);
  executed.add(testId);
  return { source, next };
};

const venus = sourceFor("sky-placement/article/venus/virgo");
const definition = skyV4StudioDefinition(venus);
assert.equal(definition.contentType, "continuous-placement");
assert.equal(definition.editableFields.length, 6);
assert.ok(definition.readOnlyFields.includes("contentKey"));
assert.ok(definition.sourceBaselineSha256);
const fields = skyV4EditableReaderFields(venus);
const articleEdit = editOne(String(venus.contentKey), "placementArticle", `${String(fields.placementArticle)}\n\nContent Studio draft sentence.`, "CS-EDIT-001");
assert.match(String(articleEdit.next.placementArticle), /Content Studio draft sentence\.$/u);
assert.throws(() => applySkyV4ReaderFieldDraft(venus, { contentKey: "changed" }), /SKY_V4_STRUCTURE_LOCK/u);
editOne(String(venus.contentKey), "fallback.hook", "Draft fallback opening.", "CS-EDIT-002");

const settings = sourceFor("sky-v4/settings/contextual-overlays");
const settingsDraft = applySkyV4ReaderFieldDraft(settings, { contextualTransitOverlaysEnabled: false, includeContextualOverlayInFallbackHook: true });
assert.equal(settingsDraft.contextualTransitOverlaysEnabled, false);
assert.equal(settingsDraft.includeContextualOverlayInFallbackHook, true);
assert.equal(settings.maxFullPageOverlays, 2);
executed.add("CS-EDIT-003");

editOne("sky-lunation/new-moon/gemini", "NewMoonArticle", "Draft Gemini New Moon article.", "CS-EDIT-004");
const fullMoonEdit = editOne("sky-lunation/full-moon/taurus", "FullMoonArticle", "Draft Taurus Full Moon article.", "CS-EDIT-005");
assert.equal(fullMoonEdit.next.MoonSign, "Taurus");
assert.equal(fullMoonEdit.next.SunSign, "Scorpio");
assert.equal(fullMoonEdit.next.Axis, "Taurus–Scorpio");

const eclipseFallback = records.find((row: Record<string, unknown>) => row.studio_content_type === "eclipse-fallback" && row.EclipseSign === "Virgo" && row.NodeRelation === "south-node" && row.EclipseType === "solar-eclipse");
assert.ok(eclipseFallback);
const eclipseFields = skyV4EditableReaderFields(eclipseFallback);
const eclipseEdited = applySkyV4ReaderFieldDraft(eclipseFallback, { ...eclipseFields, Hook: "Draft eclipse opening." });
assert.equal(eclipseEdited.Hook, "Draft eclipse opening.");
assert.equal(eclipseEdited.Axis, eclipseFallback.Axis);
assert.equal(eclipseEdited.FallbackArticle, eclipseFallback.FallbackArticle);
executed.add("CS-EDIT-006");

const nodeModule = sourceFor("sky-nodes/north-node/aries");
editOne("sky-nodes/north-node/aries", "ExactIngressCopy", "Draft owner override.", "CS-EDIT-007");
assert.notEqual(nodeModule.ExactIngressCopy, "Draft owner override.");
const marsRetro = sourceFor("sky-placement/retrograde/mars");
const marsEdit = editOne("sky-placement/retrograde/mars", "Body", "Draft Mars retrograde modifier.", "CS-EDIT-008");
assert.equal(marsEdit.next.CopyPolicy, marsRetro.CopyPolicy);
const overlay = records.find((row: Record<string, unknown>) => String(row.contentKey).includes("venus/aries/retrograde/mercury"));
assert.ok(overlay);
const overlayEdit = editOne(String(overlay.contentKey), "OverlayBody", "Draft contextual overlay.", "CS-EDIT-009");
assert.equal(overlayEdit.next.TriggerMode, overlay.TriggerMode);

const aspectSource: Record<string, any> = {
  contentKey: "fallback-hook/sky-aspect-sign/venus/aries/conjunction/mercury/aries",
  Headline: "Venus conjunct Mercury", Body: "Approved aspect body.", BodyA: "Venus", BodyB: "Mercury",
  AspectType: "conjunction", ExactDate: "2026-04-01", studio_content_type: "aspect",
  studio_editable_fields: [{ path: "Headline", label: "Headline" }, { path: "Body", label: "Body" }],
  studio_read_only_fields: ["contentKey", "BodyA", "BodyB", "AspectType", "ExactDate"],
  studio_source_baseline: {}, source_baseline_sha256: "aspect-baseline"
};
aspectSource.studio_source_baseline = structuredClone(aspectSource);
const aspectDraft = applySkyV4ReaderFieldDraft(aspectSource, { Headline: aspectSource.Headline, Body: "Draft aspect body." });
assert.equal(aspectDraft.Body, "Draft aspect body.");
assert.equal(aspectDraft.AspectType, "conjunction");
assert.throws(() => applySkyV4ReaderFieldDraft(aspectSource, { AspectType: "square" }), /SKY_V4_STRUCTURE_LOCK/u);
executed.add("CS-EDIT-010");

const versioned: SkyV4VersionedRecord = {
  contentKey: String(venus.contentKey), contentType: definition.contentType,
  editableFields: definition.editableFields, readOnlyFields: definition.readOnlyFields,
  sourceBaseline: definition.sourceBaseline, sourceBaselineSha256: definition.sourceBaselineSha256,
  servingVersionId: null, versions: []
};
const drafted = createSkyV4DraftVersion(versioned, { ...fields, placementArticle: `${String(fields.placementArticle)}\n\nContent Studio draft sentence.` }, { versionId: "draft-1", createdAt: "2026-08-30T12:00:00.000Z", editor: "owner" });
assert.deepEqual(drafted.versions[0].changedFields, ["placementArticle"]);
assert.equal(drafted.versions[0].validation.passed, true);
assert.throws(() => transitionSkyV4Version(drafted, "draft-1", "serving"), /SKY_V4_STATUS_TRANSITION/u);
const editorial = transitionSkyV4Version(drafted, "draft-1", "editorial-reviewed");
const approved = transitionSkyV4Version(editorial, "draft-1", "owner-approved");
const serving = transitionSkyV4Version(approved, "draft-1", "serving");
const superseded = transitionSkyV4Version(serving, "draft-1", "superseded");
assert.equal(rollbackSkyV4ServingVersion(superseded, "draft-1").servingVersionId, "draft-1");
assert.throws(() => rollbackSkyV4ServingVersion(drafted, "draft-1"), /SKY_V4_ROLLBACK/u);
executed.add("CS-EDIT-011");

const failedPov = createSkyV4DraftVersion(versioned, { ...fields, placementArticle: "Right now, you are a thoughtful helper. You have a gift for thoughtful service." }, { versionId: "draft-pov", createdAt: "2026-08-30T12:01:00.000Z", editor: "owner" });
assert.equal(failedPov.versions[0].validation.passed, false);
assert.throws(() => transitionSkyV4Version(failedPov, "draft-pov", "editorial-reviewed"), /SKY_V4_POV_GATE/u);
assert.equal(validateSkyV4TransitPov("continuous-placement", { placementArticle: "As Venus moves through Virgo, care becomes practical." }).passed, true);
executed.add("CS-EDIT-012");

assert.ok(records.every((row: Record<string, unknown>) => typeof row.source_baseline_sha256 === "string" && typeof row.studio_source_baseline === "object" && Array.isArray(row.studio_read_only_fields)));
executed.add("CS-EDIT-013");

const exactEclipse = records.find((row: Record<string, unknown>) => row.studio_content_type === "eclipse-event");
assert.ok(exactEclipse);
const productionParity = renderSkyV4StudioPreview(corpus, {
  contentKey: exactEclipse.contentKey,
  draftFields: { EventArticle: `${String(exactEclipse.EventArticle)}\n\nPreview-only draft.` },
  motionConditions: [{ headline: "Mercury retrograde", dateLine: "Engine date", body: "Approved condition." }],
  aspects: [{ id: "event-aspect", bodyA: "Mars", bodyB: "Saturn", approved: true, exactDateTime: "2026-01-01", orb: 1, headline: "Mars square Saturn", dateLine: "Engine date", body: "Approved aspect." }],
  eventContextAspectIds: ["event-aspect"]
});
assert.match(productionParity.page, /Preview-only draft\.[\s\S]*What is shaping this transit now[\s\S]*Aspects shaping this transit/u);
assert.equal(productionParity.servingEnabled, false);
executed.add("CS-EDIT-014");

assert.equal(executed.size, 14, "All 14 Content Studio editing scenarios must execute.");
console.log("SKY V4 Content Studio contract: PASS (14/14 executed; immutable baseline, editable fields, lifecycle, rollback, POV gate)");
