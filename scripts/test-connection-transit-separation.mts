import assert from "node:assert/strict";
import fs from "node:fs";
import { connectionActivationKey, connectionBridgeTemplates, connectionSourceErrors, fillConnectionSource } from "../apps/web/src/content/connectionTransit";
import { publishedConnectionCopy, connectionBridgeCopy } from "../apps/web/src/features/friends/connectionTransitSources";
import { connectionSourceDraft } from "../apps/admin/src/connectionTransitSources";
import { packagePublicationAdmissionIssue } from "../api/_lib/content-studio-package-admission";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState";
import type { GeneratedContentRow } from "../apps/web/src/services/generatedContent";

const key = connectionActivationKey("ascendant", "square", "saturn")!;
const makeRow = (content_key: string, body_you: string, status = "LIVE") => ({ id: content_key, content_key, status, lane: "serving", review_state: null,
  updated_at: "2026-10-15T12:00:00Z", sections: { packageRecord: { body_you, body_they: "A different direction.", review_status: "approved" } }
}) as GeneratedContentRow;
const variables = { holder1: "O'Neil $&", transitPlanet: "Saturn", transitAspectWord: "sextile", endpointPoint: "Ascendant", yourPoint: "Ascendant", theirPoint: "Saturn", synastryAspectWord: "square" };
const body = "You talk to {{holder1}}. The whole final sentence stays here.";
const exact = makeRow(key, body);
assert.equal(publishedConnectionCopy([exact], key, variables), "You talk to O'Neil $&. The whole final sentence stays here.");
for (const status of ["DRAFT", "REVIEWED", "ARCHIVED"]) assert.equal(publishedConnectionCopy([makeRow(key, body, status)], key, variables), null);
assert.equal(publishedConnectionCopy([makeRow(key, "")], key, variables), null);
assert.equal(publishedConnectionCopy([makeRow("fallback-hook/bond-effect-sextile/saturn", body), makeRow("fallback-hook/synastry-pair/saturn/ascendant/hard", body), makeRow(connectionActivationKey("saturn", "square", "ascendant")!, body)], key, variables), null);
assert.equal(publishedConnectionCopy([makeRow(key, "Hello {{holder2}}.")], key, variables), null);
assert.equal(connectionActivationKey("ascendant", "hard", "saturn"), null);
assert(connectionSourceErrors(key, "Hello {{holder2}}.").length);
assert.equal(fillConnectionSource(key, body, {}), null);
for (const template of connectionBridgeTemplates) {
 assert(connectionBridgeCopy([], template.contentKey, variables)?.includes("O'Neil $&"));
 const draft = connectionSourceDraft(template.contentKey);
 assert.equal(draft.status, "DRAFT"); assert.equal(draft.sourceSnapshot?.contentType, "connection-transit-bridge");
 assert.equal(packagePublicationAdmissionIssue({ content_key: template.contentKey, status: "LIVE", facts: draft.facts, sections: draft.sections }), null);
 assert(packagePublicationAdmissionIssue({ content_key: template.contentKey, status: "LIVE", facts: draft.facts, sections: { packageRecord: { ...(draft.sections?.packageRecord as object), contentKey: key } } }), "Publication must preserve its source key");
 installContentPublications([{content_key:template.contentKey,state:"retired",revision:999999,updated_at:"2026-10-15T12:00:00Z",row_id:null,row_updated_at:null}]);
 assert.equal(connectionBridgeCopy([], template.contentKey, variables), null, "Retired templates must not resurrect defaults");
}
const starter = connectionSourceDraft(key);
assert.equal(starter.status, "DRAFT"); assert.equal(starter.sourceSnapshot?.contentType, "connection-activation");
assert.equal((starter.sections?.packageRecord as any).body_you, "");
assert(packagePublicationAdmissionIssue({content_key:key,status:"LIVE",facts:starter.facts,sections:starter.sections}));
const panel = fs.readFileSync(new URL("../apps/web/src/features/friends/ManualChartsPanel.tsx", import.meta.url), "utf8");
const detail = panel.slice(panel.indexOf("  const openBondTransitDetail ="), panel.indexOf("  const openBondTransitById ="));
assert.match(detail, /normalizePersonalTransitSurface/);
assert.doesNotMatch(detail, /card\.effectBody|renderReaderDirectedSynastryContact|bond-effect-/);
console.log("Connection separation passed: exact directed sources, missing/draft/retired handling, literal names, isolated drafts and no cross-type fallback.");
