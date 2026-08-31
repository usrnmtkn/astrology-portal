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
import {
  renderSkyV4StudioPreview,
  skyV4ContentStudioRecords,
  skyV4GovernedAspectStudioRecord
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";

const corpus = JSON.parse(fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json", import.meta.url), "utf8"));
const governedAspectCorpus = JSON.parse(fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json", import.meta.url), "utf8"));
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

const governedAspectRow = governedAspectCorpus.hookRows.find((row: Record<string, unknown>) => row.contentKey === "fallback-hook/sky-aspect-sign/venus/virgo/trine/saturn/capricorn");
assert.ok(governedAspectRow, "Missing real governed Venus in Virgo trine Saturn in Capricorn aspect.");
const aspectSource = skyV4GovernedAspectStudioRecord(governedAspectRow) as Record<string, any>;
assert.ok(aspectSource, "Approved governed aspect must integrate with Content Studio.");
assert.equal(aspectSource.studio_source_baseline.body_you, governedAspectRow.body_you);
assert.equal(aspectSource.studio_provenance.approvedVia, governedAspectRow.approved_via);
assert.deepEqual(aspectSource.studio_editable_fields.map((field: Record<string, unknown>) => field.path), ["Headline", "Body"]);
assert.ok(aspectSource.studio_read_only_fields.includes("AspectType"));
assert.ok(aspectSource.studio_read_only_fields.includes("calculatedDate"));
assert.ok(aspectSource.studio_read_only_fields.includes("calculatedOrb"));
const aspectDraft = applySkyV4ReaderFieldDraft(aspectSource, { Headline: aspectSource.Headline, Body: "Draft aspect body." });
assert.equal(aspectDraft.Body, "Draft aspect body.");
assert.equal(aspectDraft.AspectType, "trine");
assert.throws(() => applySkyV4ReaderFieldDraft(aspectSource, { AspectType: "square" }), /SKY_V4_STRUCTURE_LOCK/u);
const aspectVersioned: SkyV4VersionedRecord = {
  contentKey: aspectSource.contentKey,
  contentType: "aspect",
  editableFields: aspectSource.studio_editable_fields,
  readOnlyFields: aspectSource.studio_read_only_fields,
  sourceBaseline: aspectSource.studio_source_baseline,
  sourceBaselineSha256: aspectSource.source_baseline_sha256,
  servingVersionId: "approved-baseline",
  versions: []
};
const aspectDraftVersion = createSkyV4DraftVersion(
  aspectVersioned,
  { Headline: aspectSource.Headline, Body: "Draft aspect body." },
  { versionId: "aspect-draft-1", createdAt: "2026-08-30T12:00:00.000Z", editor: "owner" }
);
assert.deepEqual(aspectDraftVersion.versions[0].changedFields, ["Body"]);
assert.equal(aspectDraftVersion.versions[0].status, "draft");
assert.equal(aspectDraftVersion.servingVersionId, "approved-baseline");
assert.throws(() => transitionSkyV4Version(aspectDraftVersion, "aspect-draft-1", "serving"), /SKY_V4_STATUS_TRANSITION/u);
const validAspectPreview = renderSkyV4StudioPreview(corpus, {
  contentKey: aspectSource.contentKey,
  governedAspectSource: governedAspectRow,
  draftFields: { Body: "Draft aspect body." },
  previewSurface: { kind: "continuous", subjectBody: "venus", subjectSign: "virgo", calculatedDate: "September 3, 2026", calculatedOrb: "1°" }
});
assert.match(validAspectPreview.page, /Aspects shaping this transit[\s\S]*Draft aspect body\./u);
assert.deepEqual(validAspectPreview.selectedAspectIds, [aspectSource.contentKey]);
const unsupportedAspectPreview = renderSkyV4StudioPreview(corpus, {
  contentKey: aspectSource.contentKey,
  governedAspectSource: governedAspectRow,
  previewSurface: { kind: "continuous", subjectBody: "mars", subjectSign: "aries", calculatedDate: "September 3, 2026", calculatedOrb: "1°" }
});
assert.equal(unsupportedAspectPreview.page, "");
assert.deepEqual(unsupportedAspectPreview.selectedAspectIds, []);
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

const exactEclipse = records.find((row: Record<string, unknown>) => row.contentKey === "sky-lunation/lunar-eclipse/2025-03-14-virgo");
assert.ok(exactEclipse);
const productionParity = renderSkyV4StudioPreview(corpus, {
  contentKey: exactEclipse.contentKey,
  draftFields: { EventArticle: `${String(exactEclipse.EventArticle)}\n\nPreview-only draft.` },
  cycleContext: "Approved eclipse-cycle context.",
  eclipseContext: "Approved node and series context.",
  motionConditions: [{ headline: "Mercury retrograde", dateLine: "Engine date", body: "Approved condition." }],
  aspects: [{ id: "event-aspect", bodyA: "Moon", bodyB: "Saturn", approved: true, exactDateTime: "2026-01-01", orb: 1, headline: "Moon opposite Saturn", dateLine: "Engine date", body: "Approved aspect." }]
});
assert.match(productionParity.page, /## TLDR[\s\S]*Preview-only draft\.[\s\S]*Approved eclipse-cycle context\.[\s\S]*Approved node and series context\.[\s\S]*## Other Conditions[\s\S]*## Key aspects/u);
assert.doesNotMatch(productionParity.page, /Aspects shaping this transit/u);
assert.equal(productionParity.resolution, "exact-event");
const exactFallback = renderSkyV4StudioPreview(corpus, { contentKey: exactEclipse.contentKey, exactAvailable: false });
assert.equal(exactFallback.resolution, "sign-aware-fallback");
const newMoonParity = renderSkyV4StudioPreview(corpus, {
  contentKey: "sky-lunation/new-moon/gemini",
  cycleContext: "Approved cycle context.",
  aspects: [{ id: "new-moon-aspect", bodyA: "Sun", bodyB: "Mercury", approved: true, exactDateTime: "2026-06-01", orb: 1, headline: "Sun conjunct Mercury", dateLine: "Engine date", body: "Approved aspect." }]
});
assert.match(newMoonParity.page, /Approved cycle context\.[\s\S]*## Key aspects/u);
const fullMoonParity = renderSkyV4StudioPreview(corpus, {
  contentKey: "sky-lunation/full-moon/taurus",
  aspects: [{ id: "full-moon-axis", bodyA: "Moon", bodyB: "Sun", approved: true, exactDateTime: "2026-11-01", orb: 0, headline: "Moon opposite Sun", dateLine: "Engine date", body: "Approved axis aspect." }]
});
assert.deepEqual(fullMoonParity.axis, { moonSign: "Taurus", sunSign: "Scorpio", axis: "Taurus–Scorpio" });
assert.match(fullMoonParity.page, /## Key aspects/u);
const continuousParity = renderSkyV4StudioPreview(corpus, {
  contentKey: "sky-placement/article/venus/aries",
  dateLine: "Engine dates",
  contexts: [{ subjectFamily: "continuous", subjectBody: "Venus", subjectSign: "Aries", subjectCondition: "retrograde", contextKind: "co-present-motion", contextBodyOrEvent: "Mercury", contextSign: "Aries", contextCondition: "retrograde" }],
  motionConditions: [{ headline: "Venus retrograde", dateLine: "Engine date", body: "Approved condition." }],
  aspects: [{ id: "venus-aspect", bodyA: "Venus", bodyB: "Saturn", approved: true, exactDateTime: "2026-04-01", orb: 1, headline: "Venus trine Saturn", dateLine: "Engine date", body: "Approved aspect." }]
});
assert.match(continuousParity.page, /Mercury retrograde[\s\S]*What is shaping this transit now[\s\S]*Aspects shaping this transit/u);
const zeroOptional = renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/new-moon/gemini" });
assert.doesNotMatch(zeroOptional.page, /## (Other Conditions|Key aspects)/u);
assert.equal(productionParity.servingEnabled, false);
executed.add("CS-EDIT-014");

assert.equal(executed.size, 14, "All 14 Content Studio editing scenarios must execute.");
console.log("SKY V4 Content Studio contract: PASS (14/14 executed; immutable baseline, editable fields, lifecycle, rollback, POV gate)");
