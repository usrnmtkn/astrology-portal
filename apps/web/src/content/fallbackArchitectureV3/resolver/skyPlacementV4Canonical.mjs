import { sha256Text } from "./contentIntegrity.mjs";
import continuousOwnerApproval from "../authored-inputs/sky-v4-continuous-120-owner-approval-v1.json" with { type: "json" };
import readerCopyOwnerApproval from "../authored-inputs/sky-v4-reader-copy-280-owner-approval-v1.json" with { type: "json" };
import readerCopyServingRelease from "../authored-inputs/sky-v4-reader-copy-280-serving-release-v1.json" with { type: "json" };

export const SKY_V4_CANONICAL_PACKAGE_VERSION = "SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30";
export const SKY_V4_CANONICAL_JSON_SHA256 = "9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750";

const SIGNS = Object.freeze([
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
]);

const CONTINUOUS_PLANETS = Object.freeze([
  "sun", "mercury", "venus", "mars", "jupiter",
  "saturn", "uranus", "neptune", "pluto", "chiron"
]);

const CONTINUOUS_OWNER_APPROVED_KEYS = new Set(continuousOwnerApproval.approved_keys);
const READER_COPY_OWNER_APPROVED_KEYS = new Set(readerCopyOwnerApproval.approved_keys);
const READER_COPY_SERVING_KEYS = new Set(readerCopyOwnerApproval.approved_keys);
const SKY_V4_CONFIGURATION_TYPES = new Set(["template", "overlay-settings"]);

export const SKY_V4_OVERLAY_DEFAULTS = Object.freeze({
  contextualTransitOverlaysEnabled: true,
  includeContextualOverlayInFallbackHook: false,
  maxFullPageOverlays: 2,
  maxFallbackOverlays: 1
});

function text(value) {
  return typeof value === "string" ? value : "";
}

function lower(value) {
  return text(value).trim().toLowerCase();
}

function slug(value) {
  return lower(value).replace(/[\s_]+/gu, "-");
}

function title(value) {
  return text(value)
    .trim()
    .replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (match) => match.toUpperCase());
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sha256(value) {
  return sha256Text(value);
}

function valueAt(source, path) {
  return path.split(".").reduce((current, part) => record(current)[part], source);
}

function required(value, label) {
  const resolved = text(value);
  if (!resolved.trim()) throw new Error(`SKY_V4_SOURCE_GAP: ${label}`);
  return resolved;
}

function withoutUnresolvedSlots(value) {
  const unresolved = text(value).match(/\{\{[^}]+\}\}/gu) ?? [];
  if (unresolved.length) {
    throw new Error(`SKY_V4_SOURCE_GAP: unresolved slots ${[...new Set(unresolved)].join(", ")}`);
  }
  return text(value).trim();
}

function fillFacts(value, facts) {
  return text(value).replace(/\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/gu, (match, key) => (
    Object.hasOwn(facts, key) ? text(facts[key]) : match
  ));
}

export function assertSkyV4CanonicalPackage(corpus) {
  if (corpus?.packageVersion !== SKY_V4_CANONICAL_PACKAGE_VERSION) {
    throw new Error(`SKY_V4_GOVERNANCE: expected ${SKY_V4_CANONICAL_PACKAGE_VERSION}.`);
  }
  if (corpus?.servingEnabled !== false) {
    throw new Error("SKY_V4_GOVERNANCE: canonical handoff must remain non-serving.");
  }
  if (corpus?.packageStatus !== "READY_FOR_OWNER_REVIEW_BEFORE_CODEX") {
    throw new Error("SKY_V4_GOVERNANCE: unexpected package review state.");
  }

  const articles = corpus?.content?.continuous ?? [];
  const keys = new Set(articles.map((article) => article.contentKey));
  if (articles.length !== 120 || keys.size !== 120) {
    throw new Error("SKY_V4_GOVERNANCE: continuous corpus must contain 120 unique records.");
  }
  for (const planet of CONTINUOUS_PLANETS) {
    for (const sign of SIGNS) {
      if (!keys.has(`sky-placement/article/${planet}/${sign}`)) {
        throw new Error(`SKY_V4_GOVERNANCE: missing sky-placement/article/${planet}/${sign}.`);
      }
    }
  }
  return corpus;
}

export function assertSkyV4ContinuousOwnerApproval(corpus) {
  assertSkyV4CanonicalPackage(corpus);
  const continuousKeys = new Set(corpus.content.continuous.map((row) => row.contentKey));
  if (continuousOwnerApproval.canonical_package_version !== SKY_V4_CANONICAL_PACKAGE_VERSION) {
    throw new Error("SKY_V4_GOVERNANCE: continuous approval package version mismatch.");
  }
  if (continuousOwnerApproval.canonical_json_sha256 !== SKY_V4_CANONICAL_JSON_SHA256) {
    throw new Error("SKY_V4_GOVERNANCE: continuous approval canonical hash mismatch.");
  }
  if (
    continuousOwnerApproval.review_status !== "approved"
    || continuousOwnerApproval.owner_approved !== true
    || continuousOwnerApproval.serving_enabled !== false
  ) {
    throw new Error("SKY_V4_GOVERNANCE: continuous approval lifecycle state is invalid.");
  }
  if (CONTINUOUS_OWNER_APPROVED_KEYS.size !== 120) {
    throw new Error("SKY_V4_GOVERNANCE: continuous approval must contain 120 unique keys.");
  }
  for (const key of CONTINUOUS_OWNER_APPROVED_KEYS) {
    if (!continuousKeys.has(key)) {
      throw new Error(`SKY_V4_GOVERNANCE: approval contains non-canonical key ${key}.`);
    }
  }
  for (const key of continuousKeys) {
    if (!CONTINUOUS_OWNER_APPROVED_KEYS.has(key)) {
      throw new Error(`SKY_V4_GOVERNANCE: canonical continuous key lacks explicit approval ${key}.`);
    }
  }
  return continuousOwnerApproval;
}

export function assertSkyV4ReaderCopyOwnerApproval(corpus, records = []) {
  assertSkyV4ContinuousOwnerApproval(corpus);
  if (readerCopyOwnerApproval.canonical_package_version !== SKY_V4_CANONICAL_PACKAGE_VERSION) {
    throw new Error("SKY_V4_GOVERNANCE: reader-copy approval package version mismatch.");
  }
  if (readerCopyOwnerApproval.canonical_json_sha256 !== SKY_V4_CANONICAL_JSON_SHA256) {
    throw new Error("SKY_V4_GOVERNANCE: reader-copy approval canonical hash mismatch.");
  }
  if (
    readerCopyOwnerApproval.review_status !== "approved"
    || readerCopyOwnerApproval.owner_approved !== true
    || readerCopyOwnerApproval.serving_enabled !== false
  ) {
    throw new Error("SKY_V4_GOVERNANCE: reader-copy approval lifecycle state is invalid.");
  }
  if (
    readerCopyOwnerApproval.expected_approved_reader_records !== 280
    || readerCopyOwnerApproval.expected_additional_reader_records !== 160
    || READER_COPY_OWNER_APPROVED_KEYS.size !== 280
  ) {
    throw new Error("SKY_V4_GOVERNANCE: reader-copy approval must contain exactly 280 unique keys and 160 additions.");
  }
  for (const key of CONTINUOUS_OWNER_APPROVED_KEYS) {
    if (!READER_COPY_OWNER_APPROVED_KEYS.has(key)) {
      throw new Error(`SKY_V4_GOVERNANCE: expanded approval lost prior continuous key ${key}.`);
    }
  }
  if (records.length) {
    const recordsByKey = new Map(records.map((row) => [row.contentKey, row]));
    const approvedRecords = records.filter((row) => row.owner_approved === true);
    const configurationRecords = records.filter((row) => SKY_V4_CONFIGURATION_TYPES.has(row.studio_content_type));
    if (records.length !== 305 || approvedRecords.length !== 280 || configurationRecords.length !== 25) {
      throw new Error("SKY_V4_GOVERNANCE: expected 305 records: 280 reader-copy approvals and 25 configuration records.");
    }
    for (const key of READER_COPY_OWNER_APPROVED_KEYS) {
      const row = recordsByKey.get(key);
      if (!row) throw new Error(`SKY_V4_GOVERNANCE: approval contains non-canonical key ${key}.`);
      const expectedFields = readerCopyOwnerApproval.approved_fields_by_content_type[row.studio_content_type];
      const editableFields = row.studio_editable_fields.map((field) => field.path);
      if (JSON.stringify(row.owner_approved_fields) !== JSON.stringify(expectedFields)) {
        throw new Error(`SKY_V4_GOVERNANCE: approved-field mismatch for ${key}.`);
      }
      if (JSON.stringify(editableFields) !== JSON.stringify(expectedFields)) {
        throw new Error(`SKY_V4_GOVERNANCE: editable-field contract drift for ${key}.`);
      }
    }
    if (configurationRecords.some((row) => (
      row.review_status !== "needs_review"
      || row.owner_approved !== false
      || row.serving_enabled !== false
      || row.studio_review_category !== "configuration"
    ))) {
      throw new Error("SKY_V4_GOVERNANCE: templates and overlay settings must remain non-serving configuration, not approved prose.");
    }
    const servingRecords = records.filter((row) => row.serving_enabled === true);
    if (servingRecords.length !== 280 || servingRecords.some((row) => !READER_COPY_SERVING_KEYS.has(row.contentKey))) {
      throw new Error("SKY_V4_GOVERNANCE: exactly the 280 explicitly released reader records must be serving-enabled.");
    }
  }
  return readerCopyOwnerApproval;
}

export function assertSkyV4ReaderCopyServingRelease(corpus) {
  assertSkyV4ReaderCopyOwnerApproval(corpus);
  const releasedKeysSha256 = sha256(JSON.stringify(readerCopyOwnerApproval.approved_keys));
  const expectedCounts = readerCopyOwnerApproval.expected_counts_by_content_type;
  if (
    readerCopyServingRelease.schema !== "tldrastro-sky-v4-serving-release/v1"
    || readerCopyServingRelease.canonical_package_version !== SKY_V4_CANONICAL_PACKAGE_VERSION
    || readerCopyServingRelease.canonical_json_sha256 !== SKY_V4_CANONICAL_JSON_SHA256
    || readerCopyServingRelease.approval_id !== readerCopyOwnerApproval.approval_id
    || readerCopyServingRelease.expected_serving_records !== 280
    || readerCopyServingRelease.serving_enabled !== true
    || readerCopyServingRelease.resolver_conditional !== true
    || readerCopyServingRelease.configuration_records_excluded !== 25
    || readerCopyServingRelease.released_keys_sha256 !== releasedKeysSha256
    || JSON.stringify(readerCopyServingRelease.expected_counts_by_content_type) !== JSON.stringify(expectedCounts)
    || READER_COPY_SERVING_KEYS.size !== 280
  ) {
    throw new Error("SKY_V4_GOVERNANCE: reader-copy serving release is invalid or stale.");
  }
  return readerCopyServingRelease;
}

function studioRecord({
  source,
  contentKey,
  contentType,
  headline,
  body,
  summary = "",
  editableFields,
  readOnlyFields,
  sourceUrls = [],
  ownerPhraseAnchors = [],
  contentRole = "full_copy"
}) {
  const baseline = structuredClone(source);
  const baselineJson = JSON.stringify(baseline);
  const approvedFields = READER_COPY_OWNER_APPROVED_KEYS.has(contentKey)
    ? readerCopyOwnerApproval.approved_fields_by_content_type[contentType] ?? []
    : [];
  const ownerApproved = approvedFields.length > 0;
  const servingEnabled = ownerApproved && READER_COPY_SERVING_KEYS.has(contentKey);
  const configuration = SKY_V4_CONFIGURATION_TYPES.has(contentType);
  return {
    ...source,
    contentKey,
    headline,
    body_you: body,
    summary,
    content_role: contentRole,
    review_status: ownerApproved ? readerCopyOwnerApproval.review_status : "needs_review",
    surface: "sky",
    render_policy: "sky-v4-canonical-stage-preview",
    source_package: SKY_V4_CANONICAL_PACKAGE_VERSION,
    source_baseline_sha256: sha256(baselineJson),
    studio_content_type: contentType,
    studio_editable_fields: editableFields,
    studio_read_only_fields: readOnlyFields,
    studio_source_urls: sourceUrls.filter(Boolean),
    studio_owner_phrase_anchors: ownerPhraseAnchors.filter(Boolean),
    studio_source_baseline: baseline,
    studio_version_status: servingEnabled ? "approved-serving-baseline" : "draft",
    studio_review_category: configuration
      ? "configuration"
      : ownerApproved
        ? "owner-approved-reader-copy"
        : "reader-copy",
    owner_approved: ownerApproved,
    serving_enabled: servingEnabled,
    ...(ownerApproved ? {
      approved_via: readerCopyOwnerApproval.approval_record,
      owner_approval_id: readerCopyOwnerApproval.approval_id,
      owner_approval_lineage: contentType === "continuous-placement"
        ? [continuousOwnerApproval.approval_record, readerCopyOwnerApproval.approval_record]
        : [readerCopyOwnerApproval.approval_record],
      owner_approved_fields: approvedFields
    } : {}),
    note: ownerApproved
      ? "Canonical SKY V4 reader copy is owner-approved and explicitly released against the immutable package hash. Any edit creates a separate non-serving draft; the approved serving baseline remains unchanged."
      : configuration
        ? "Canonical SKY V4 configuration record. It is not reader prose and remains outside the writing-approval queue."
        : "Canonical SKY V4 stage-only Content Studio record. The immutable package baseline is retained; edits create non-serving draft versions."
  };
}

function anchors(value) {
  return text(value).split("|").map((entry) => entry.trim()).filter(Boolean);
}

function continuousStudioRecords(corpus) {
  return corpus.content.continuous.map((row) => studioRecord({
    source: row,
    contentKey: row.contentKey,
    contentType: "continuous-placement",
    headline: `${row.planet} in ${row.sign}`,
    body: row.placementArticle,
    summary: row.tldrTakeaway,
    editableFields: [
      { path: "tldrWhat", label: "TLDR What" },
      { path: "tldrTakeaway", label: "TLDR Takeaway" },
      { path: "placementArticle", label: "Placement article" },
      { path: "fallback.hook", label: "Fallback opening" },
      { path: "fallback.lived", label: "Fallback: how it shows up" },
      { path: "fallback.turn", label: "Fallback: challenge and response" }
    ],
    readOnlyFields: ["planet", "sign", "contentKey", "sourceExactStatus", "sourcePrimary", "sourceSecondary"],
    sourceUrls: [row.sourcePrimary, row.sourceSecondary],
    ownerPhraseAnchors: anchors(row.ownerPhraseAnchors)
  }));
}

function newMoonStudioRecords(corpus) {
  return corpus.content.newMoon.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "new-moon",
    headline: `New Moon in ${row.Sign}`,
    body: row.NewMoonArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "NewMoonArticle", label: "New Moon article" }
    ],
    readOnlyFields: ["Sign", "ContentKey", "CycleRole", "PrimarySource", "SecondarySource"],
    sourceUrls: [row.PrimarySource, row.SecondarySource],
    ownerPhraseAnchors: anchors(row.ExactPhraseAnchors)
  }));
}

function fullMoonStudioRecords(corpus) {
  return corpus.content.fullMoon.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "full-moon",
    headline: `Full Moon in ${row.MoonSign}`,
    body: row.FullMoonArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "FullMoonArticle", label: "Full Moon article" }
    ],
    readOnlyFields: ["MoonSign", "SunSign", "Axis", "ContentKey", "PrimarySource", "SecondarySource"],
    sourceUrls: [row.PrimarySource, row.SecondarySource],
    ownerPhraseAnchors: anchors(row.ExactPhraseAnchors)
  }));
}

function eclipseEventStudioRecords(corpus) {
  return corpus.content.eclipseEvents.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "eclipse-event",
    headline: row.Event,
    body: row.EventArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "EventArticle", label: "Eclipse event article" }
    ],
    readOnlyFields: ["Event", "Type", "MoonSign", "SunSign", "Axis", "NodeRelation", "ContentKey"],
    sourceUrls: [row.PrimarySource, row.SecondarySource],
    ownerPhraseAnchors: anchors(row.ExactPhraseAnchors)
  }));
}

function eclipseFallbackStudioRecords(corpus) {
  return corpus.content.eclipseFallbacks.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "eclipse-fallback",
    headline: `${row.NodeRelation} ${row.EclipseType} in ${row.EclipseSign}`,
    body: row.FallbackArticle,
    editableFields: [
      { path: "Hook", label: "Fallback opening" },
      { path: "Lived", label: "Fallback: how it shows up" },
      { path: "Turn", label: "Fallback: challenge and response" }
    ],
    readOnlyFields: ["EclipseType", "NodeRelation", "EclipseSign", "OppositeSign", "Axis", "ContentKey"],
    sourceUrls: [row.PrimaryMarieSource, row.SecondaryMarieSource],
    ownerPhraseAnchors: anchors(row.ExactPhraseOrIdeaAnchors),
    contentRole: "fallback_hook"
  }));
}

function genericEclipseStudioRecords(corpus) {
  return corpus.content.eclipseGenericFallbacks.map((row) => studioRecord({
    source: row,
    contentKey: `sky-v4/eclipse-generic/${lower(row.EclipseType)}/${lower(row.NodeRelation)}`.replace(/\s+/gu, "-"),
    contentType: "generic-eclipse-fallback",
    headline: `${row.NodeRelation} ${row.EclipseType} fallback`,
    body: row.ModifierArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "ModifierArticle", label: "Generic eclipse fallback" }
    ],
    readOnlyFields: ["EclipseType", "NodeRelation", "Mechanism", "RequiredSeriesFields"],
    sourceUrls: [row.PrimaryMarieSource],
    ownerPhraseAnchors: anchors(row.MariePhraseAnchors),
    contentRole: "fallback_hook"
  }));
}

function nodeStudioRecords(corpus) {
  const axes = corpus.content.nodeAxes.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "node-axis",
    headline: `North Node in ${row.NorthSign} / South Node in ${row.SouthSign}`,
    body: row.NodeAxisArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_North", label: "TLDR North Node" },
      { path: "TLDR_South", label: "TLDR South Node" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "NodeAxisArticle", label: "Node axis article" }
    ],
    readOnlyFields: ["NorthSign", "SouthSign", "Axis", "ContentKey"],
    sourceUrls: [row.PrimarySource, row.SecondarySource]
  }));
  const modules = [
    ...corpus.content.northNodeModules.map((row) => ({ ...row, Node: "North" })),
    ...corpus.content.southNodeModules.map((row) => ({ ...row, Node: "South" }))
  ].map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "node-module",
    headline: `${row.Node} Node in ${row.Sign}`,
    body: row.ExactIngressCopy,
    editableFields: [{ path: "ExactIngressCopy", label: "Draft override of exact ingress copy" }],
    readOnlyFields: ["Node", "Sign", "OpposingSouthSign", "OpposingNorthSign", "ContentKey", "Mechanism", "OwnerApprovedForSourceRole"],
    sourceUrls: [row.Source]
  }));
  const education = corpus.content.nodeEducation.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "node-education",
    headline: row.Module,
    body: row.Article,
    editableFields: [{ path: "Article", label: "Node education article" }],
    readOnlyFields: ["Module", "ContentKey", "Governance"]
  }));
  return [...axes, ...modules, ...education];
}

function lilithStudioRecords(corpus) {
  const articles = corpus.content.lilith.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "lilith",
    headline: `Lilith in ${row.Sign}`,
    body: row.LilithArticle,
    summary: row.TLDR_Takeaway,
    editableFields: [
      { path: "TLDR_What", label: "TLDR What" },
      { path: "TLDR_Takeaway", label: "TLDR Takeaway" },
      { path: "LilithArticle", label: "Lilith article" }
    ],
    readOnlyFields: ["Sign", "ContentKey", "ObjectType", "PointType", "Exact_Tagline", "Exact_Hook", "Exact_Lived", "Exact_Turn"],
    sourceUrls: [row.PrimarySource]
  }));
  const stations = corpus.content.lilithCurrentConditions.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "lilith-station",
    headline: row.Headline,
    body: row.Body,
    editableFields: [
      { path: "Headline", label: "Station headline draft" },
      { path: "Body", label: "Station body draft" }
    ],
    readOnlyFields: ["Condition", "ContentKey", "RuntimeRule", "Governance"],
    sourceUrls: [row.Source],
    contentRole: "fallback_hook"
  }));
  return [...articles, ...stations];
}

function retrogradeStudioRecords(corpus) {
  return corpus.content.retrogradeGeneric.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "retrograde",
    headline: `${row.Planet} retrograde modifier`,
    body: row.Body,
    summary: row.CanonicalShort,
    editableFields: [
      { path: "CanonicalShort", label: "Short retrograde copy draft" },
      { path: "Body", label: "Retrograde body draft" }
    ],
    readOnlyFields: ["Planet", "ContentKey", "CopyPolicy", "AllowParaphrase", "ShortOwnerApproved", "BodyOwnerApproved"],
    sourceUrls: [row.PrimarySource, row.SecondarySource],
    ownerPhraseAnchors: anchors(row.OwnerPhraseAnchors),
    contentRole: "fallback_hook"
  }));
}

function overlayStudioRecords(corpus) {
  return corpus.content.contextualTransitOverlays.map((row) => studioRecord({
    source: row,
    contentKey: row.OverlayKey,
    contentType: "overlay",
    headline: `${row.SubjectBody} in ${row.SubjectSign}: ${row.ContextBodyOrEvent}`,
    body: row.OverlayBody,
    summary: row.FallbackHookOverlay,
    editableFields: [
      { path: "OverlayBody", label: "Full-page contextual overlay" },
      { path: "FallbackHookOverlay", label: "Fallback contextual overlay" }
    ],
    readOnlyFields: [
      "OverlayKey", "SubjectFamily", "SubjectBody", "SubjectSign", "SubjectCondition",
      "ContextKind", "ContextBodyOrEvent", "ContextSign", "ContextCondition", "TriggerMode",
      "SameSign", "SameAxis", "SuppressIfExactAspectDuplicate", "SuppressIfEventArticleOwnsMechanism"
    ],
    sourceUrls: [row.PrimaryMarieSource],
    ownerPhraseAnchors: anchors(row.ExactPhraseAnchors),
    contentRole: "fallback_hook"
  }));
}

function seasonalStudioRecords(corpus) {
  return corpus.content.seasonalContext.map((row) => studioRecord({
    source: row,
    contentKey: row.ContentKey,
    contentType: "seasonal",
    headline: `${row.Sign} seasonal context (${row.Hemisphere})`,
    body: row.Copy,
    editableFields: [{ path: "Copy", label: "Seasonal context copy" }],
    readOnlyFields: ["Sign", "Hemisphere", "ContentKey"],
    sourceUrls: [row.Source],
    contentRole: "fallback_hook"
  }));
}

function templateStudioRecords(corpus) {
  const templates = Object.entries(corpus.templates).flatMap(([family, rows]) => rows
    .filter((row) => text(row.TemplateID) && text(row.Template))
    .map((row) => studioRecord({
      source: row,
      contentKey: `sky-v4/template/${family}/${row.TemplateID}`,
      contentType: "template",
      headline: row.Purpose,
      body: row.Template,
      editableFields: [{ path: "Template", label: "Mustache template" }],
      readOnlyFields: ["TemplateID", "Purpose", "Contract"],
      contentRole: "template"
    })));
  const overlaySettings = studioRecord({
    source: {
      contextualTransitOverlaysEnabled: true,
      includeContextualOverlayInFallbackHook: false,
      maxFullPageOverlays: 2,
      maxFallbackOverlays: 1,
      contract: corpus.runtime.contentStudioOverlaySettings
    },
    contentKey: "sky-v4/settings/contextual-overlays",
    contentType: "overlay-settings",
    headline: "SKY V4 contextual overlay settings",
    body: "Contextual transit overlays are enabled for full-page previews. Fallback-hook overlays remain off unless the editor enables the independent child toggle.",
    editableFields: [
      { path: "contextualTransitOverlaysEnabled", label: "Use contextual transit overlays" },
      { path: "includeContextualOverlayInFallbackHook", label: "Include transit context in fallback hook" }
    ],
    readOnlyFields: ["maxFullPageOverlays", "maxFallbackOverlays", "contract"],
    contentRole: "template"
  });
  return [...templates, overlaySettings];
}

export function skyV4ContentStudioRecords(corpus) {
  assertSkyV4CanonicalPackage(corpus);
  assertSkyV4ReaderCopyServingRelease(corpus);
  const records = [
    ...continuousStudioRecords(corpus),
    ...newMoonStudioRecords(corpus),
    ...fullMoonStudioRecords(corpus),
    ...eclipseEventStudioRecords(corpus),
    ...eclipseFallbackStudioRecords(corpus),
    ...genericEclipseStudioRecords(corpus),
    ...nodeStudioRecords(corpus),
    ...lilithStudioRecords(corpus),
    ...retrogradeStudioRecords(corpus),
    ...overlayStudioRecords(corpus),
    ...seasonalStudioRecords(corpus),
    ...templateStudioRecords(corpus)
  ];
  assertSkyV4ReaderCopyOwnerApproval(corpus, records);
  return records;
}

export function continuousArticleFor(corpus, planet, sign) {
  assertSkyV4CanonicalPackage(corpus);
  const key = `sky-placement/article/${lower(planet)}/${lower(sign)}`;
  return corpus.content.continuous.find((row) => row.contentKey === key) ?? null;
}

function overlayMatches(overlay, input) {
  return lower(overlay.SubjectFamily) === lower(input.subjectFamily)
    && lower(overlay.SubjectBody) === lower(input.subjectBody)
    && lower(overlay.SubjectSign) === lower(input.subjectSign)
    && lower(overlay.SubjectCondition) === lower(input.subjectCondition)
    && lower(overlay.ContextKind) === lower(input.contextKind)
    && lower(overlay.ContextBodyOrEvent) === lower(input.contextBodyOrEvent)
    && lower(overlay.ContextSign) === lower(input.contextSign)
    && lower(overlay.ContextCondition) === lower(input.contextCondition);
}

export function resolveSkyV4ContextualOverlays(corpus, contexts = [], settings = {}, suppressions = {}, scope = "full-page") {
  assertSkyV4CanonicalPackage(corpus);
  const options = { ...SKY_V4_OVERLAY_DEFAULTS, ...settings };
  if (!options.contextualTransitOverlaysEnabled) return [];
  const fallbackScope = scope === "fallback";
  const limit = fallbackScope ? options.maxFallbackOverlays : options.maxFullPageOverlays;

  return corpus.content.contextualTransitOverlays
    .filter((overlay) => contexts.some((context) => overlayMatches(overlay, context)))
    .filter((overlay) => !(overlay.SuppressIfExactAspectDuplicate && suppressions.exactAspectDuplicateKeys?.includes(overlay.OverlayKey)))
    .filter((overlay) => !(overlay.SuppressIfEventArticleOwnsMechanism && suppressions.eventOwnedMechanismKeys?.includes(overlay.OverlayKey)))
    .filter((overlay) => !fallbackScope || overlay.FallbackHookEligible === true)
    .sort((left, right) => Number(left.Priority) - Number(right.Priority) || left.OverlayKey.localeCompare(right.OverlayKey))
    .slice(0, Math.max(0, Number(limit) || 0));
}

export function selectSkyV4Aspects(aspects = [], { subjectBody, eventContextAspectIds = [], lumination = false } = {}) {
  const subject = lower(subjectBody);
  const explicit = new Set(eventContextAspectIds.map(String));
  return aspects
    .filter((aspect) => aspect?.approved === true)
    .filter((aspect) => {
      const bodies = [lower(aspect.bodyA), lower(aspect.bodyB)];
      if (lumination) return bodies.includes("sun") || bodies.includes("moon") || explicit.has(String(aspect.id));
      return bodies.includes(subject);
    })
    .sort((left, right) => (
      text(left.exactDateTime).localeCompare(text(right.exactDateTime))
      || Number(left.orb ?? Infinity) - Number(right.orb ?? Infinity)
      || text(left.id).localeCompare(text(right.id))
    ));
}

export function resolveSkyV4Retrograde(corpus, { body, sign, exactCopy = "", stationSupported = false } = {}) {
  assertSkyV4CanonicalPackage(corpus);
  const normalizedBody = lower(body);
  if (["sun", "moon"].includes(normalizedBody)) return { resolution: "omit", body: "" };
  if (["north-node", "south-node", "north node", "south node", "nodes", "lunar nodes"].includes(normalizedBody)) {
    return { resolution: "node-motion-education", body: "" };
  }
  if (["lilith", "black moon lilith"].includes(normalizedBody)) {
    const station = stationSupported ? corpus.content.lilithCurrentConditions[0] : null;
    return { resolution: station ? "lilith-station" : "omit", body: station?.Body ?? "" };
  }
  if (text(exactCopy).trim()) return { resolution: "exact-sign", body: exactCopy, lookupKey: `${normalizedBody}|${lower(sign)}|retrograde` };
  const generic = corpus.content.retrogradeGeneric.find((row) => lower(row.Planet) === normalizedBody);
  return { resolution: generic ? "generic-body" : "omit", body: generic?.Body ?? "", lookupKey: generic?.ContentKey ?? null };
}

export function resolveSkyV4EclipseMainBody(corpus, {
  exactEventKey = "", eclipseType, nodeRelation, eclipseSign, exactAvailable = true,
  signFallbackAvailable = true, genericFallbackAvailable = true
} = {}) {
  assertSkyV4CanonicalPackage(corpus);
  const exact = exactAvailable
    ? corpus.content.eclipseEvents.find((row) => row.ContentKey === exactEventKey)
    : null;
  if (exact) return { resolution: "exact-event", contentKey: exact.ContentKey, body: exact.EventArticle };
  const signAware = signFallbackAvailable ? corpus.content.eclipseFallbacks.find((row) => (
    slug(row.EclipseType) === slug(eclipseType)
    && slug(row.NodeRelation) === slug(nodeRelation)
    && lower(row.EclipseSign) === lower(eclipseSign)
  )) : null;
  if (signAware) return { resolution: "sign-aware-fallback", contentKey: signAware.ContentKey, body: [signAware.Hook, signAware.Lived, signAware.Turn].join("\n\n") };
  const generic = genericFallbackAvailable ? corpus.content.eclipseGenericFallbacks.find((row) => (
    slug(row.EclipseType) === slug(eclipseType) && slug(row.NodeRelation) === slug(nodeRelation)
  )) : null;
  if (generic) return {
    resolution: "generic-type-node-fallback",
    contentKey: `sky-v4/eclipse-generic/${lower(generic.EclipseType)}/${lower(generic.NodeRelation)}`.replace(/\s+/gu, "-"),
    body: generic.ModifierArticle
  };
  return { resolution: "facts-only", contentKey: null, body: "" };
}

export function resolveSkyV4Lunation(corpus, { phase, sign, articleAvailable = true } = {}) {
  assertSkyV4CanonicalPackage(corpus);
  const isFull = lower(phase) === "full-moon";
  const row = articleAvailable
    ? (isFull ? corpus.content.fullMoon.find((item) => lower(item.MoonSign) === lower(sign)) : corpus.content.newMoon.find((item) => lower(item.Sign) === lower(sign)))
    : null;
  if (!row) return { resolution: "facts-only", body: "", axis: null };
  return {
    resolution: "canonical-lunation",
    body: isFull ? row.FullMoonArticle : row.NewMoonArticle,
    axis: isFull ? { moonSign: row.MoonSign, sunSign: row.SunSign, axis: row.Axis } : null,
    contentKey: row.ContentKey
  };
}

function renderCondition(condition) {
  return `### ${required(condition.headline, "condition headline")}\n${required(condition.dateLine, "condition date line")}\n\n${required(condition.body, "condition body")}`;
}

function renderAspect(aspect) {
  return `### ${required(aspect.headline, "aspect headline")}\n${required(aspect.dateLine, "aspect date line")}\n\n${required(aspect.body, "aspect body")}`;
}

export function renderSkyV4ContinuousPreview(corpus, input) {
  const article = input.articleOverride ?? continuousArticleFor(corpus, input.planet, input.sign);
  const facts = input.facts ?? {};
  const fullArticle = article && input.articleAvailable !== false
    ? withoutUnresolvedSlots(fillFacts(article.placementArticle, facts))
    : "";
  const overlays = resolveSkyV4ContextualOverlays(corpus, input.contexts, input.overlaySettings, input.overlaySuppressions);
  const fallbackOverlays = resolveSkyV4ContextualOverlays(
    corpus, input.contexts, input.overlaySettings, input.overlaySuppressions, "fallback"
  );
  const fallbackOverlay = input.overlaySettings?.includeContextualOverlayInFallbackHook
    ? fallbackOverlays[0]?.FallbackHookOverlay ?? ""
    : "";
  const fallback = article && input.fallbackAvailable !== false
    ? [article.fallback?.hook, fallbackOverlay, article.fallback?.lived, article.fallback?.turn]
      .filter(Boolean)
      .map((part) => withoutUnresolvedSlots(fillFacts(part, facts)))
      .join("\n\n")
    : "";
  const mainBody = fullArticle || fallback;
  const resolution = fullArticle ? "canonical-article" : fallback ? "exact-fallback" : "facts-only";
  const aspects = selectSkyV4Aspects(input.aspects, { subjectBody: input.planet });
  const blocks = [`# ${title(input.planet)} in ${title(input.sign)}`];
  if (text(input.dateLine).trim()) blocks.push(input.dateLine);
  if (mainBody) {
    blocks.push(`## TLDR\n\n**What:** ${article.tldrWhat}\n\n**Takeaway:** ${article.tldrTakeaway}`);
    if (input.seasonalContext) blocks.push(input.seasonalContext);
    blocks.push(mainBody);
    if (fullArticle && overlays.length) blocks.push(overlays.map((overlay) => overlay.OverlayBody).join("\n\n"));
  }
  if ((input.motionConditions ?? []).length) {
    blocks.push(`## What is shaping this transit now\n\n${input.motionConditions.map(renderCondition).join("\n\n")}`);
  }
  if (aspects.length) {
    blocks.push(`## Aspects shaping this transit\n\n${aspects.map(renderAspect).join("\n\n")}`);
  }
  return {
    contentKey: article?.contentKey ?? `sky-placement/article/${lower(input.planet)}/${lower(input.sign)}`,
    resolution,
    selectedOverlayKeys: overlays.map((overlay) => overlay.OverlayKey),
    selectedFallbackOverlayKeys: fallbackOverlays.map((overlay) => overlay.OverlayKey),
    selectedAspectIds: aspects.map((aspect) => aspect.id),
    page: blocks.join("\n\n").trim()
  };
}

function nodeRelationSlug(value) {
  const normalized = slug(value);
  if (normalized.includes("south-node")) return "south-node";
  if (normalized.includes("north-node")) return "north-node";
  return normalized;
}

function tldrFor(source) {
  const what = text(source.TLDR_What || source.tldrWhat).trim();
  const takeaway = text(source.TLDR_Takeaway || source.tldrTakeaway || source.TLDR).trim();
  if (!what && !takeaway) return "";
  return `## TLDR\n\n${what ? `**What:** ${what}` : ""}${what && takeaway ? "\n\n" : ""}${takeaway ? `**Takeaway:** ${takeaway}` : ""}`;
}

function renderFamilyConditions(conditions = []) {
  return conditions.length ? `## Other Conditions\n\n${conditions.map(renderCondition).join("\n\n")}` : "";
}

function renderFamilyAspects(aspects = []) {
  return aspects.length ? `## Key aspects\n\n${aspects.map(renderAspect).join("\n\n")}` : "";
}

function matchingOverlayContexts(source, input) {
  if (input.contexts?.length) return input.contexts;
  const body = source.Sign ? "New Moon" : source.MoonSign ? "Full Moon" : source.Type?.includes("solar") ? "Solar Eclipse" : "Lunar Eclipse";
  const sign = source.Sign || source.MoonSign || source.EclipseSign || "";
  return [{
    subjectFamily: source.Type ? "eclipse" : "lunation",
    subjectBody: body,
    subjectSign: sign,
    subjectCondition: source.Type || source.EclipseType || "",
    contextKind: "", contextBodyOrEvent: "", contextSign: "", contextCondition: ""
  }];
}

function renderSkyV4LunationStudioPreview(corpus, source, input) {
  const isFull = source.studio_content_type === "full-moon";
  const body = withoutUnresolvedSlots(fillFacts(isFull ? source.FullMoonArticle : source.NewMoonArticle, record(input.facts)));
  const overlays = resolveSkyV4ContextualOverlays(
    corpus, matchingOverlayContexts(source, input), input.overlaySettings, input.overlaySuppressions
  );
  const aspects = selectSkyV4Aspects(input.aspects, {
    subjectBody: isFull ? "moon" : "moon",
    eventContextAspectIds: input.eventContextAspectIds,
    lumination: true
  });
  const blocks = [`# ${source.headline}`];
  if (text(input.dateLine).trim()) blocks.push(input.dateLine);
  const tldr = tldrFor(source);
  if (tldr) blocks.push(tldr);
  if (body) blocks.push(body);
  if (overlays.length) blocks.push(overlays.map((overlay) => overlay.OverlayBody).join("\n\n"));
  if (text(input.cycleContext).trim()) blocks.push(input.cycleContext);
  const conditions = renderFamilyConditions(input.motionConditions ?? []);
  if (conditions) blocks.push(conditions);
  const keyAspects = renderFamilyAspects(aspects);
  if (keyAspects) blocks.push(keyAspects);
  return {
    resolution: "canonical-lunation",
    axis: isFull ? { moonSign: source.MoonSign, sunSign: source.SunSign, axis: source.Axis } : null,
    selectedOverlayKeys: overlays.map((overlay) => overlay.OverlayKey),
    selectedAspectIds: aspects.map((aspect) => aspect.id),
    page: blocks.join("\n\n").trim()
  };
}

function renderSkyV4EclipseStudioPreview(corpus, source, input) {
  const exact = source.studio_content_type === "eclipse-event";
  const signFallback = source.studio_content_type === "eclipse-fallback";
  const eclipseType = source.Type || source.EclipseType;
  const eclipseSign = source.MoonSign || source.EclipseSign;
  const nodeRelation = nodeRelationSlug(source.NodeRelation);
  let resolved;
  if (exact && input.exactAvailable !== false) {
    resolved = { resolution: "exact-event", contentKey: source.ContentKey, body: source.EventArticle };
  } else if (signFallback) {
    resolved = { resolution: "sign-aware-fallback", contentKey: source.ContentKey, body: [source.Hook, source.Lived, source.Turn].filter(Boolean).join("\n\n") };
  } else if (source.studio_content_type === "generic-eclipse-fallback") {
    resolved = { resolution: "generic-type-node-fallback", contentKey: source.contentKey, body: source.ModifierArticle };
  } else {
    resolved = resolveSkyV4EclipseMainBody(corpus, {
      exactEventKey: source.ContentKey,
      eclipseType,
      nodeRelation,
      eclipseSign,
      exactAvailable: false,
      signFallbackAvailable: input.signFallbackAvailable !== false,
      genericFallbackAvailable: input.genericFallbackAvailable !== false
    });
  }
  const body = resolved.body ? withoutUnresolvedSlots(fillFacts(resolved.body, record(input.facts))) : "";
  const overlays = resolveSkyV4ContextualOverlays(
    corpus, matchingOverlayContexts(source, input), input.overlaySettings, input.overlaySuppressions
  );
  const aspects = selectSkyV4Aspects(input.aspects, {
    subjectBody: "moon",
    eventContextAspectIds: input.eventContextAspectIds,
    lumination: true
  });
  const blocks = [`# ${source.headline}`];
  if (text(input.dateLine).trim()) blocks.push(input.dateLine);
  const tldr = tldrFor(source);
  if (tldr) blocks.push(tldr);
  if (body) blocks.push(body);
  if (overlays.length) blocks.push(overlays.map((overlay) => overlay.OverlayBody).join("\n\n"));
  if (text(input.cycleContext).trim()) blocks.push(input.cycleContext);
  if (text(input.eclipseContext).trim()) blocks.push(input.eclipseContext);
  const conditions = renderFamilyConditions(input.motionConditions ?? []);
  if (conditions) blocks.push(conditions);
  const keyAspects = renderFamilyAspects(aspects);
  if (keyAspects) blocks.push(keyAspects);
  return {
    resolution: resolved.resolution,
    selectedOverlayKeys: overlays.map((overlay) => overlay.OverlayKey),
    selectedAspectIds: aspects.map((aspect) => aspect.id),
    page: blocks.join("\n\n").trim()
  };
}

function setValueAt(source, path, nextValue) {
  const next = structuredClone(source);
  const parts = path.split(".");
  let cursor = next;
  for (const part of parts.slice(0, -1)) {
    cursor[part] = { ...record(cursor[part]) };
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = nextValue;
  return next;
}

function studioReaderBody(source) {
  if (source.studio_content_type === "eclipse-fallback") {
    return [source.Hook, source.Lived, source.Turn].filter(Boolean).join("\n\n");
  }
  const paths = [
    "placementArticle", "NewMoonArticle", "FullMoonArticle", "EventArticle",
    "FallbackArticle", "ModifierArticle", "NodeAxisArticle", "ExactIngressCopy",
    "Article", "LilithArticle", "Body", "OverlayBody", "Copy", "Template"
  ];
  const body = paths.map((path) => valueAt(source, path)).find((value) => text(value).trim());
  if (body) return text(body);
  const fallback = [source.Hook, source.Lived, source.Turn].filter(Boolean).join("\n\n");
  return fallback || text(source.body_you);
}

export function skyV4GovernedAspectStudioRecord(sourceRow) {
  if (!sourceRow || sourceRow.review_status !== "approved") return null;
  const parts = text(sourceRow.contentKey).split("/");
  if (parts.length !== 7 || parts[0] !== "fallback-hook" || parts[1] !== "sky-aspect-sign") return null;
  const [, , bodyA, signA, aspectType, bodyB, signB] = parts;
  const headline = `${title(bodyA)} in ${title(signA)} ${lower(aspectType)} ${title(bodyB)} in ${title(signB)}`;
  const baseline = {
    ...structuredClone(sourceRow),
    Headline: headline,
    Body: sourceRow.body_you,
    BodyA: bodyA,
    SignA: signA,
    BodyB: bodyB,
    SignB: signB,
    AspectType: aspectType
  };
  return {
    ...sourceRow,
    Headline: headline,
    Body: sourceRow.body_you,
    BodyA: bodyA,
    SignA: signA,
    BodyB: bodyB,
    SignB: signB,
    AspectType: aspectType,
    contentKey: sourceRow.contentKey,
    headline,
    studio_content_type: "aspect",
    studio_editable_fields: [
      { path: "Headline", label: "Headline" },
      { path: "Body", label: "Body" }
    ],
    studio_read_only_fields: [
      "contentKey", "BodyA", "SignA", "BodyB", "SignB", "AspectType",
      "calculatedDate", "calculatedOrb", "review_status", "source_keys", "approved_via"
    ],
    studio_source_baseline: baseline,
    studio_governed_source_record: structuredClone(sourceRow),
    source_baseline_sha256: sha256(JSON.stringify(baseline)),
    studio_provenance: {
      reviewStatus: sourceRow.review_status,
      approvedVia: sourceRow.approved_via,
      sourceKeys: sourceRow.source_keys ?? []
    },
    studio_version_status: "approved-baseline",
    owner_approved: true,
    serving_enabled: true,
    studio_preview_requires: ["calculatedDate", "calculatedOrb"],
    note: "Existing governed aspect corpus record. Reader fields create a separate non-serving draft; identity, runtime facts, governance, and approved baseline remain immutable."
  };
}

function aspectMatchesSurface(source, surface = {}, eventContextAspectIds = []) {
  const ids = new Set(eventContextAspectIds.map(String));
  if (ids.has(text(source.contentKey))) return true;
  const subject = lower(surface.subjectBody);
  const subjectSign = lower(surface.subjectSign);
  return [lower(source.BodyA), lower(source.BodyB)].includes(subject)
    && (!subjectSign || [lower(source.SignA), lower(source.SignB)].includes(subjectSign));
}

function renderGovernedAspectStudioPreview(source, input) {
  if (!aspectMatchesSurface(source, record(input.previewSurface), input.eventContextAspectIds ?? [])) {
    return { resolution: "unsupported-aspect-omitted", selectedAspectIds: [], page: "" };
  }
  const surface = record(input.previewSurface);
  const calculatedDate = required(surface.calculatedDate, "calculated aspect date");
  const calculatedOrb = required(surface.calculatedOrb, "calculated aspect orb");
  const aspect = {
    id: source.contentKey,
    approved: true,
    bodyA: source.BodyA,
    bodyB: source.BodyB,
    headline: source.Headline,
    dateLine: `${calculatedDate} · ${calculatedOrb}`,
    body: source.Body
  };
  const lunation = ["lunation", "eclipse"].includes(lower(surface.kind));
  const heading = lunation ? "Key aspects" : "Aspects shaping this transit";
  return {
    resolution: "governed-aspect-on-valid-surface",
    selectedAspectIds: [source.contentKey],
    page: `## ${heading}\n\n${renderAspect(aspect)}`
  };
}

export function renderSkyV4StudioPreview(corpus, input) {
  const source = skyV4ContentStudioRecords(corpus).find((row) => row.contentKey === input.contentKey)
    ?? (input.governedAspectSource ? skyV4GovernedAspectStudioRecord(input.governedAspectSource) : null);
  if (!source) throw new Error(`SKY_V4_SOURCE_GAP: ${input.contentKey}`);
  const allowed = new Set(source.studio_editable_fields.map((field) => field.path));
  const draftFields = record(input.draftFields);
  const blocked = Object.keys(draftFields).filter((path) => !allowed.has(path));
  if (blocked.length) throw new Error(`SKY_V4_STRUCTURE_LOCK: ${blocked.join(", ")}`);
  const effective = Object.entries(draftFields).reduce(
    (current, [path, nextValue]) => setValueAt(current, path, nextValue),
    structuredClone(source)
  );
  if (effective.studio_content_type === "aspect") {
    const result = renderGovernedAspectStudioPreview(effective, input);
    return {
      contentKey: input.contentKey,
      contentType: effective.studio_content_type,
      sourceBaselineSha256: effective.source_baseline_sha256,
      servingEnabled: false,
      ...result
    };
  }
  if (["new-moon", "full-moon"].includes(effective.studio_content_type)) {
    const result = renderSkyV4LunationStudioPreview(corpus, effective, input);
    return {
      contentKey: input.contentKey,
      contentType: effective.studio_content_type,
      sourceBaselineSha256: effective.source_baseline_sha256,
      servingEnabled: false,
      ...result
    };
  }
  if (["eclipse-event", "eclipse-fallback", "generic-eclipse-fallback"].includes(effective.studio_content_type)) {
    const result = renderSkyV4EclipseStudioPreview(corpus, effective, input);
    return {
      contentKey: input.contentKey,
      contentType: effective.studio_content_type,
      sourceBaselineSha256: effective.source_baseline_sha256,
      servingEnabled: false,
      ...result
    };
  }
  if (effective.studio_content_type === "continuous-placement") {
    const result = renderSkyV4ContinuousPreview(corpus, {
      ...input,
      planet: effective.planet,
      sign: effective.sign,
      articleOverride: effective
    });
    return {
      ...result,
      contentKey: input.contentKey,
      contentType: effective.studio_content_type,
      sourceBaselineSha256: effective.source_baseline_sha256,
      servingEnabled: false
    };
  }
  const facts = record(input.facts);
  const body = withoutUnresolvedSlots(fillFacts(studioReaderBody(effective), facts));
  const blocks = [`# ${text(effective.headline) || title(input.contentKey)}`, body];
  const motionConditions = input.motionConditions ?? [];
  if (motionConditions.length) {
    blocks.push(`## What is shaping this transit now\n\n${motionConditions.map(renderCondition).join("\n\n")}`);
  }
  const subjectBody = text(effective.planet || effective.SubjectBody || effective.Planet || input.subjectBody);
  const aspects = selectSkyV4Aspects(input.aspects, {
    subjectBody,
    eventContextAspectIds: input.eventContextAspectIds,
    lumination: ["new-moon", "full-moon", "eclipse-event", "eclipse-fallback", "generic-eclipse-fallback"]
      .includes(effective.studio_content_type)
  });
  if (aspects.length) blocks.push(`## Aspects shaping this transit\n\n${aspects.map(renderAspect).join("\n\n")}`);
  return {
    contentKey: input.contentKey,
    contentType: effective.studio_content_type,
    sourceBaselineSha256: effective.source_baseline_sha256,
    servingEnabled: false,
    selectedAspectIds: aspects.map((aspect) => aspect.id),
    page: blocks.join("\n\n").trim()
  };
}

function releasedReaderRecord(corpus, contentKey) {
  assertSkyV4ReaderCopyServingRelease(corpus);
  if (!READER_COPY_SERVING_KEYS.has(contentKey)) {
    throw new Error(`SKY_V4_NOT_RELEASED: ${contentKey}`);
  }
  const row = skyV4ContentStudioRecords(corpus).find((candidate) => candidate.contentKey === contentKey);
  if (!row || row.owner_approved !== true || row.serving_enabled !== true) {
    throw new Error(`SKY_V4_NOT_SERVABLE: ${contentKey}`);
  }
  return row;
}

function nodePlacementKey(body, sign) {
  const normalized = lower(body);
  if (normalized === "north-node" || normalized === "north node") return `sky-nodes/north-node/${lower(sign)}`;
  if (normalized === "south-node" || normalized === "south node") return `sky-nodes/south-node/${lower(sign)}`;
  return null;
}

/**
 * Production reader boundary for the hash-bound SKY V4 release. It accepts
 * calculated facts and governed aspect records, but never a Content Studio
 * draft. Selection remains conditional and configuration rows cannot resolve.
 */
export function renderSkyV4ReaderRoute(corpus, input) {
  if (input.draftFields && Object.keys(input.draftFields).length) {
    throw new Error("SKY_V4_READER_BOUNDARY: drafts cannot render on reader routes.");
  }
  let contentKey = text(input.contentKey).trim();
  let resolution = "exact-canonical-key";
  const route = lower(input.route);
  if (!contentKey && route === "placement") {
    const body = lower(input.planet);
    contentKey = body === "lilith" || body === "black-moon-lilith"
      ? `sky-lilith/article/${lower(input.sign)}`
      : nodePlacementKey(body, input.sign)
        ?? `sky-placement/article/${body}/${lower(input.sign)}`;
  } else if (!contentKey && route === "new-moon") {
    contentKey = `sky-lunation/new-moon/${lower(input.sign)}`;
  } else if (!contentKey && route === "full-moon") {
    contentKey = `sky-lunation/full-moon/${lower(input.sign)}`;
  } else if (!contentKey && route === "eclipse") {
    const selected = resolveSkyV4EclipseMainBody(corpus, input);
    resolution = selected.resolution;
    if (!selected.contentKey) {
      return {
        route,
        resolution: "facts-only",
        contentKey: null,
        servingEnabled: false,
        versionStatus: "facts-only",
        page: "",
        readerParts: []
      };
    }
    contentKey = selected.contentKey;
  } else if (!contentKey && route === "node-axis") {
    contentKey = `sky-nodes/axis/${lower(input.northSign)}-${lower(input.southSign)}`;
  } else if (!contentKey && route === "lilith-station") {
    if (input.stationSupported !== true) {
      return { route, resolution: "unsupported-condition-omitted", contentKey: null, servingEnabled: false, page: "", readerParts: [] };
    }
    contentKey = "sky-lilith/station";
  } else if (!contentKey && route === "seasonal") {
    contentKey = `sky-placement/seasonal-context/${lower(input.sign)}/${lower(input.hemisphere)}`;
  }
  const source = releasedReaderRecord(corpus, contentKey);
  const preview = renderSkyV4StudioPreview(corpus, { ...input, contentKey, draftFields: {} });
  const baseBody = studioReaderBody(source);
  const readerParts = [];
  const what = text(source.TLDR_What || source.tldrWhat).trim();
  const takeaway = text(source.TLDR_Takeaway || source.tldrTakeaway || source.TLDR).trim();
  if (what) readerParts.push(what);
  if (takeaway) readerParts.push(takeaway);
  if (baseBody) readerParts.push(withoutUnresolvedSlots(fillFacts(baseBody, record(input.facts))));
  if (route === "placement" && input.isRetrograde === true) {
    const retrograde = resolveSkyV4Retrograde(corpus, { body: input.planet, sign: input.sign, stationSupported: input.stationSupported });
    if (retrograde.body && retrograde.lookupKey && READER_COPY_SERVING_KEYS.has(retrograde.lookupKey)) {
      readerParts.push(withoutUnresolvedSlots(fillFacts(retrograde.body, record(input.facts))));
    }
  }
  return {
    ...preview,
    route,
    resolution: resolution === "exact-canonical-key" ? preview.resolution : resolution,
    contentKey,
    servingEnabled: true,
    versionStatus: "approved-serving-baseline",
    sourceBaselineSha256: source.source_baseline_sha256,
    readerParts,
    page: preview.page
  };
}

export function skyV4RuntimeCoverage(corpus) {
  assertSkyV4CanonicalPackage(corpus);
  const records = skyV4ContentStudioRecords(corpus);
  const byType = Object.fromEntries([...new Set(records.map((row) => row.studio_content_type))]
    .sort()
    .map((type) => [type, records.filter((row) => row.studio_content_type === type).length]));
  return {
    packageVersion: corpus.packageVersion,
    servingEnabled: corpus.servingEnabled,
    recordCount: records.length,
    byType,
    continuousCount: corpus.content.continuous.length,
    fallbackCount: corpus.content.continuous.filter((row) => row.fallback?.hook && row.fallback?.lived && row.fallback?.turn).length,
    overlayCount: corpus.content.contextualTransitOverlays.length,
    compositionScenarioCount: corpus.runtime.compositionRegressionMatrix.length,
    editingTestCount: corpus.runtime.contentStudioEditingTests.length
  };
}

export function skyV4FieldValue(source, path) {
  return valueAt(source, path);
}
