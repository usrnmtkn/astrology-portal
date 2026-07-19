import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const app = read("apps/web/src/App.tsx");
const page = read("apps/web/src/features/you/YouPage.tsx");
const component = read("apps/web/src/features/you/NatalAspectPatternsSection.tsx");
const service = read("apps/web/src/services/natalAspectPatterns.ts");
const types = read("apps/web/src/types.ts");
const styles = read("apps/web/src/styles/cards.css");

assert.match(service, /VITE_ENABLE_NATAL_ASPECT_PATTERNS/, "Reader visibility must be guarded by a narrow feature flag.");
assert.match(service, /natalAspectPatternReaderFlagStorageKey = "tldrastro:natalAspectPatterns"/, "Local dev override must be narrow.");
assert.match(service, /import\.meta\.env\.PROD\) return false/, "Local storage override must not enable production.");
assert.match(service, /VITE_ENABLE_NATAL_ASPECT_PATTERN_ACTIVATION/, "Activation visibility must be guarded by a separate feature flag.");
assert.match(service, /natalAspectPatternActivationFlagStorageKey = "tldrastro:natalAspectPatternActivation"/, "Activation local dev override must be narrow.");
assert.match(service, /if \(!natalAspectPatternReaderEnabled\(\)\) return false/, "Activation must require the permanent natal pattern reader.");
assert.match(app, /if \(showNatalAspectPatterns\) {\s*fetchNatalAspectPatternsWithCopy\(birthLocation, birthDateTime, \{ includeActivationCopy: showNatalAspectPatternActivation \}\)/s, "Natal aspect-pattern copy must load only when the feature is enabled.");
assert.match(app, /setProfileNatalAspectPatternStatus\(showNatalAspectPatterns \? "loading" : "idle"\)/, "Pattern loading must not block the natal chart.");
assert.match(app, /skyWithNatalAspectPatternCopy\(currentSky, aspectPatterns\)/, "Aspect patterns must be attached by copying the sky snapshot.");
assert.match(app, /showNatalAspectPatterns\s*\?\s*natalAspectPatternReaderItems\(natalSky\)/, "Reader items must be derived only when enabled.");
assert.match(app, /natalAspectPatternStatus={natalAspectPatternStatus}/, "YouPage must receive an explicit reader status.");
assert.match(page, /NatalAspectPatternsSection/, "YouPage must render the natal pattern section via a dedicated component.");

assert.match(service, /includeAspectPatterns:\s*"true"/, "Reader data request must opt into aspect patterns.");
assert.match(service, /includeAspectPatternCopy:\s*"true"/, "Reader data request must opt into resolved copy.");
assert.match(service, /includeAspectPatternActivation/, "Activation requests must opt into activation math only when enabled.");
assert.match(service, /includeAspectPatternActivationContexts/, "Activation requests must opt into activation contexts only when enabled.");
assert.match(service, /includeAspectPatternActivationCopy/, "Activation requests must opt into resolved activation copy only when enabled.");
assert.match(service, /activation\?\.resolvedCopy/, "Reader items must consume canonical sky.aspectPatterns.activation.resolvedCopy.");
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
assert.match(component, /Your chart does not contain one of the six larger aspect patterns currently covered here\. Your individual aspects still describe important connections between your planets\./, "Empty state wording must match approved copy.");
assert.match(component, /Pattern notes are temporarily unavailable\./, "Unavailable state must be restrained.");
assert.match(component, /Checking larger chart patterns\./, "Loading state must be nonblocking.");
assert.match(component, /primary = topLevel\[0\]/, "Highest-ranked independent item should become primary.");
assert.match(component, /topLevel\.slice\(1\)/, "Additional independent items should be collapsed.");
assert.match(component, /childPatternIds/, "Contained patterns must be nested under parents.");
assert.match(component, /parentPatternIds/, "Parent links must be respected for nesting.");
assert.match(component, /Supporting pattern detail/, "Contained patterns must be visible as supporting detail.");
assert.match(component, /Active now/, "Activation callout title must be present.");
assert.match(component, /item\.activationCopy\?\.content/, "Activation rendering must read resolved activation copy content only.");
assert.match(component, /activation\.sections\.filter/, "Empty activation sections must not render headings.");
assert.match(component, /activationSectionLabel\(section\.id\)/, "Activation section labels should map resolved section IDs.");
assert.match(component, /open=\{item\.activationExpanded/, "Primary current activation may begin expanded.");
assert.match(component, /hasExpandedActivation\(childItems\(item, items\)\)/, "Contained current activations may expand their natal parent.");

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
assert.match(component, /copy\.sections\.filter/, "Empty resolved sections must not render headings.");
assert.match(component, /sectionLabel\(section\.id\)/, "Reader labels should map section IDs to human labels.");
assert.match(types, /aspectPatterns\?: import\("@tldr\/astro-knowledge\/aspect-pattern-engine"\)\.AspectPatternDetectionResult/, "SkySnapshot must carry canonical aspect pattern data.");
assert.match(styles, /natal-patterns-section/);
assert.match(styles, /natal-pattern-card__supporting/);

console.log("Natal aspect-pattern reader contract tests passed.");
