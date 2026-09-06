import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const app = read("apps/web/src/App.tsx");
const manualChartsPanel = read("apps/web/src/features/friends/ManualChartsPanel.tsx");
const manualChartsController = read("apps/web/src/features/friends/useManualChartsController.ts");
const readerSurfaces = `${app}\n${manualChartsPanel}`;
const page = read("apps/web/src/features/you/YouPage.tsx");
const component = read("apps/web/src/features/you/NatalAspectPatternsSection.tsx");
const labels = read("apps/web/src/features/you/natalAspectPatternLabels.ts");
const chartPatternPill = read("apps/web/src/features/friends/ChartPatternPill.tsx");
const friendChartsList = read("apps/web/src/features/friends/FriendChartsList.tsx");
const friendNatalTab = read("apps/web/src/features/friends/FriendNatalTab.tsx");
const socialFriendsPanel = read("apps/web/src/features/friends/SocialFriendsPanel.tsx");
const service = read("apps/web/src/services/natalAspectPatterns.ts");
const serverPatternAdapter = read("api/_lib/aspect-patterns.ts");
const adminPatternPreview = read("api/admin/aspect-pattern-writeups.ts");
const patternEngine = read("packages/astro-knowledge/engine/aspect-patterns/index.js");
const types = read("apps/web/src/types.ts");
const styles = read("apps/web/src/styles/cards.css");
const webPackage = JSON.parse(read("apps/web/package.json"));

assert.match(service, /VITE_ENABLE_NATAL_ASPECT_PATTERNS/, "Reader visibility must be guarded by a narrow feature flag.");
assert.match(webPackage.scripts.dev, /VITE_ENABLE_NATAL_ASPECT_PATTERNS=true/, "Local web development must enable the permanent natal pattern reader.");
assert.match(service, /natalAspectPatternReaderFlagStorageKey = "tldrastro:natalAspectPatterns"/, "Local dev override must be narrow.");
assert.match(service, /import\.meta\.env\.PROD\) return false/, "Local storage override must not enable production.");
assert.match(service, /VITE_ENABLE_NATAL_ASPECT_PATTERN_ACTIVATION/, "Activation visibility must be guarded by a separate feature flag.");
assert.match(service, /natalAspectPatternActivationFlagStorageKey = "tldrastro:natalAspectPatternActivation"/, "Activation local dev override must be narrow.");
assert.match(service, /if \(!natalAspectPatternReaderEnabled\(\)\) return false/, "Activation must require the permanent natal pattern reader.");
assert.match(app, /if \(showNatalAspectPatterns\) {\s*fetchNatalAspectPatternsWithCopy\(birthLocation, birthDateTime, \{ includeActivationCopy: showNatalAspectPatternActivation, timeKnown: !unknownBirthTime \}\)/s, "Natal aspect-pattern copy must load only when the feature is enabled and must declare whether the birth time is known.");
assert.match(
  app,
  /setProfileNatalAspectPatternStatus\(\s*showNatalAspectPatterns\s*\?\s*natalSky\.aspectPatterns\?\.interpretationContexts\s*\?\s*"ready"\s*:\s*"loading"\s*:\s*"idle"\s*\)/s,
  "Cached pattern copy may resolve immediately; otherwise pattern loading must not block the natal chart."
);
assert.match(manualChartsController, /skyWithNatalAspectPatternCopy\(natalSky, aspectPatterns\)/, "Aspect patterns must be attached by copying the sky snapshot in the extracted manual-chart controller.");
assert.match(app, /showNatalAspectPatterns\s*\?\s*natalAspectPatternReaderItems\(natalSky\)/, "Reader items must be derived only when enabled.");
assert.match(app, /natalAspectPatternStatus={natalAspectPatternStatus}/, "YouPage must receive an explicit reader status.");
assert.match(readerSurfaces, /showFriendNatalAspectPatterns\s*=\s*natalAspectPatternReaderEnabled\(\)/, "Friends natal charts must use the same guarded reader flag.");
assert.match(readerSurfaces, /natalAspectPatternReaderItemsForOwner\(\s*selectedFriendReadyNatalChart,\s*selectedChart\.displayName,\s*selectedChartIsEvent \? "chart" : "person",\s*selectedChart\.pronouns\s*\)/s, "Friends natal charts must derive reader items only from the complete snapshot, with the selected chart name and saved pronouns.");
assert.doesNotMatch(readerSurfaces, /natalAspectPatternReaderItems\([^)]*,\s*"they"\)/, "Friends natal charts must not rely on the retired ignored voice argument.");
assert.match(readerSurfaces, /copy:\s*natalAspectPatternCopyForOwner\(item\.copy,\s*ownerName,\s*ownerKind,\s*ownerPronouns\)/s, "Friend pattern preview and detail copy must share the owner-aware transformation.");
assert.match(readerSurfaces, /activationCopy:\s*item\.activationCopy\s*\?\s*natalAspectPatternActivationCopyForOwner\(item\.activationCopy,\s*ownerName,\s*ownerKind,\s*ownerPronouns\)/s, "Friend pattern activation copy must use the same owner-aware transformation.");
assert.match(readerSurfaces, /createNatalGeneratedCopyForOwnerConverter\(ownerName,\s*ownerKind,\s*ownerPronouns,\s*false\)/, "Pattern copy must retain the first generated owner-name mention instead of collapsing it back to a pronoun.");
assert.match(readerSurfaces, /\|leave\|leaves\|left\) you/, "Pattern object clauses such as “leave [name] out” must use object grammar.");
assert.match(readerSurfaces, /patternTitle=\{`Patterns in \$\{possessiveLabel\(selectedChart\.displayName\)\} chart`\}/, "Friends natal patterns must derive the section label from the chart owner's name.");
assert.match(friendNatalTab, /<NatalAspectPatternsSection[\s\S]*title=\{patternTitle\}/, "The deferred Friends natal tab must forward its owner-aware section title.");
assert.match(manualChartsPanel, /selectedFriendNatalAspectPatternStatus/, "Friends natal charts must compute an explicit reader status.");
assert.match(manualChartsPanel, /<FriendNatalTab[\s\S]*onOpenPattern=\{openFriendNatalAspectPatternDetail\}[\s\S]*patternItems=\{selectedFriendNatalAspectPatternItems\}[\s\S]*patternStatus=\{selectedFriendNatalAspectPatternStatus\}/, "App must pass owner-aware pattern data and actions into the deferred Friends natal tab.");
assert.match(friendNatalTab, /<NatalAspectPatternsSection\s+items=\{patternItems\}\s+onOpenDetail=\{onOpenPattern\}\s+status=\{patternStatus\}\s+title=\{patternTitle\}/s, "The deferred Friends natal tab must render the shared pattern preview with a detail action.");
assert.match(service, /natalAspectPatternPillSummary/, "Friends lists must derive compact pattern summaries from stored snapshots.");
assert.match(service, /confidence === "exact" \|\| pattern\.geometry\.confidence === "strong"/, "Pattern pills must remain limited to exact and strong detections.");
assert.match(chartPatternPill, /confirmed chart/, "Pattern pills must expose their complete contents to assistive technology.");
assert.match(friendChartsList, /<ChartPatternPill summary=\{patternSummary\}/, "Saved-chart rows must surface confirmed pattern summaries.");
assert.match(socialFriendsPanel, /showPatternPills && chartAvailable[\s\S]*natalAspectPatternPillSummary\(friend\.natalChart\)/, "Circle rows must surface summaries only for shared, available snapshots.");
assert.doesNotMatch(`${friendChartsList}\n${socialFriendsPanel}`, /fetchNatalAspectPatternsWithCopy|\bfetch\(/, "Friends lists must not trigger per-row pattern requests.");
assert.match(page, /NatalAspectPatternsSection/, "YouPage must render the natal pattern section via a dedicated component.");

assert.match(service, /includeAspectPatterns:\s*"true"/, "Reader data request must opt into aspect patterns.");
assert.match(service, /includeAspectPatternCopy:\s*"true"/, "Reader data request must ask for governed resolver copy; the astro-knowledge resolver is the canonical copy system.");
assert.match(serverPatternAdapter, /resolvedCopy:\s*resolveAspectPatternCopies\(interpretationContexts/, "Reader runtime must resolve natal copy through the shared aspect-pattern engine.");
assert.match(adminPatternPreview, /engine\.resolveAspectPatternCopy\(context/, "Dashboard previews must resolve natal copy through the shared aspect-pattern engine.");
assert.match(patternEngine, /return resolveAspectPatternV3Copy\(context\)/, "Reader runtime and dashboard previews must converge on the same canonical V3 resolver.");
assert.match(service, /options\.timeKnown === false/, "Reader data request must forward unknown birth time to the API.");
assert.match(service, /params\.set\("timeKnown", "false"\)/, "Unknown birth time must reach the API as an explicit request field.");
assert.match(service, /includeAspectPatternActivation/, "Activation requests must opt into activation math only when enabled.");
assert.match(service, /includeAspectPatternActivationContexts/, "Activation requests must opt into activation contexts only when enabled.");
assert.match(service, /params\.set\("includeAspectPatternActivationCopy", "true"\)/, "Activation requests must use governed resolver activation copy.");
assert.doesNotMatch(service, /renderAspectPatternV3|fallbackArchitectureV3Runtime|SourceGapError/, "Reader items must not render retired local V3 aspect-pattern copy; the governed resolver is canonical.");
assert.match(service, /resolvedCopy/, "Reader items must consume server-resolved governed copy.");
assert.doesNotMatch(service, /package_\$\{|package_1|package_2/, "Reader items must never synthesize generic package section ids.");
assert.match(service, /currentDisplayOrder/, "Current display order may be used for activation emphasis.");
assert.match(service, /fetch\(`\/api\/astrology-facts\?\$\{params\.toString\(\)\}`, \{ method: "GET" \}\)/, "Reader aspect-pattern request must be read-only.");
assert.doesNotMatch(service, /\bmethod:\s*"(POST|PUT|PATCH|DELETE)"/, "Reader aspect-pattern service must make no write requests.");
assert.match(service, /return \{\s*\.\.\.snapshot,\s*aspectPatterns/s, "Enrichment must copy the snapshot instead of mutating it.");
assert.match(app, /console\.warn\("Natal aspect-pattern copy request failed\."/);
assert.doesNotMatch(component, /detectPatterns|rankAspectPatterns|resolveAspectPattern|buildAspectPatternInterpretationContexts/, "Reader component must not run resolver or detector logic.");
assert.doesNotMatch(component, /\{\{[a-zA-Z0-9_]+\}\}/, "Reader component must not interpolate mustache slots.");
assert.doesNotMatch(component, /\bfetch\(|method:\s*"(POST|PUT|PATCH|DELETE)"/, "Reader component must make no content requests.");
assert.doesNotMatch(component, /activationSummary|primaryTrigger|activationScore|sourceAspectId|reason|policy|diagnostics|provenance/, "Reader component must not inspect activation internals.");

assert.match(component, /Patterns in your chart/, "Section title must be present.");
assert.match(component, /if \(status === "unavailable"\) \{\s*return null;/, "Unavailable pattern data must stay out of the reader surface.");
assert.match(component, /if \(status === "loading"\) \{\s*return null;/, "Pattern loading must stay nonblocking and omit a placeholder.");
assert.match(component, /if \(!primary\) \{\s*return null;/, "Charts without a supported pattern must not render an empty-state card.");
assert.match(component, /primary = topLevel\[0\]/, "Highest-ranked independent item should become primary.");
assert.match(component, /topLevel\.slice\(1\)/, "Additional independent items should remain available as compact previews.");
assert.match(component, /childPatternIds/, "Contained patterns must be nested under parents.");
assert.match(component, /parentPatternIds/, "Parent links must be respected for nesting.");
assert.match(component, /onOpenDetail\?\.\(item, nestedItems\)/, "Contained patterns must travel with their parent into the detail reader.");
assert.match(component, />Details</, "Every pattern preview must provide an explicit Details action.");
assert.doesNotMatch(component, /<details className="natal-pattern-card/, "Permanent natal pattern copy must not expand inline.");
assert.match(component, /Active chart patterns/, "Activation contacts must be labeled as a transit/update section, not natal copy.");
assert.match(component, /item\.activationCopy\?\.content/, "Activation rendering must read resolved activation copy content only.");
assert.match(component, /Active chart patterns[\s\S]*<ActiveNowCallout item=\{item\}/, "Temporary activation callouts must render only from the dedicated active-pattern section.");
assert.match(component, /activation\.sections\.filter/, "Empty activation sections must not render headings.");
assert.match(component, /activationSectionLabel\(section\.id\)/, "Activation section labels should map resolved section IDs.");
assert.match(component, /updates-aspect-row[\s\S]*friend-transit-row[\s\S]*active-chart-pattern-row/, "Activation contacts should use the same row card treatment as transit themes.");
assert.doesNotMatch(component, /hasExpandedActivation/, "Temporary activation state must not control permanent natal pattern expansion.");

const forbiddenReaderLeaks = [
  "sourceAspectIds",
  "baseDisplayPriority",
  "structuralContext",
  "natalProminence",
  "ranking reasons",
  "warning codes",
  "detectorVersion",
  "resolverVersion",
  "contentLevel",
  "templateId",
  "missingSlots",
  "attemptedRecordIds",
  "provenance"
];

for (const phrase of forbiddenReaderLeaks) {
  assert.doesNotMatch(component, new RegExp(phrase, "i"), `Reader component must not expose ${phrase}.`);
}

assert.match(component, /item\.copy\.content/, "Reader must read from the resolved copy content object.");
assert.match(component, /copy\.headline/, "Reader must render resolved headline.");
assert.match(component, /copy\.overview/, "Reader must render resolved overview.");
assert.match(page, /natalAspectPatternDetailArticle/, "Full pattern copy must render through the profile detail reader.");
assert.match(page, /bodyBeforeSections:\s*true,[\s\S]*body:\s*\[copy\.overview\]/, "The pattern detail reader must begin with the main write-up before its titled sections.");
assert.match(page, /copy\.sections/, "The detail reader must consume resolved pattern sections.");
assert.match(page, /resolvedNatalAspectPatternSectionLabel\(section\)/, "Reader labels should map section IDs to human labels.");
assert.doesNotMatch(labels, /replace\(\/_\/g, " "\)/, "Reader must never render a raw section id as a heading.");
assert.match(page, /Boolean\(section\.body && section\.heading\)/, "Sections without an approved reader label must not render in the detail reader.");
assert.match(component, /section\.id !== "timing" && activationSectionLabel\(section\.id\)/, "Activation sections without an approved reader label must not render at all.");
assert.match(labels, /confidence_note: "Reading note"/, "Confidence qualifications must keep a reader-facing label.");
assert.match(types, /aspectPatterns\?: import\("@tldr\/astro-knowledge\/aspect-pattern-engine"\)\.AspectPatternDetectionResult/, "SkySnapshot must carry canonical aspect pattern data.");
assert.match(styles, /natal-patterns-section/);
assert.match(styles, /natal-pattern-card__details-button/);

console.log("Natal aspect-pattern reader contract tests passed.");