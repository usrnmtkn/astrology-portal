import { servingPackageRecords } from "./serving-package-records.js";
import { skyPlacementStudioRecord } from "./sky-placement-sources.js";
import { mergeStudioPackagePatch } from "../../src/shared/studioPackagePatch.js";
import { isRetiredCompositionKey } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";
import { isGovernedReaderEligible } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser.js";

// Reader data only. Approval, publication, lifecycle and integrity receipts
// belong to the saved source and must never be inferred from missing metadata.
const readerFields = new Set([
  "headline", "headline_they", "summary", "body", "body_you", "body_they", "text",
  "fact_line", "opening", "tension", "development", "close", "era_layer", "fallback",
  "tldrWhat", "tldrTakeaway", "placementArticle", "placementArticleDirect", "placementArticleRetrograde",
  "TLDR_What", "TLDR_Takeaway", "NewMoonArticle", "FullMoonArticle", "EventArticle", "FallbackArticle",
  "Hook", "Lived", "Turn", "ModifierArticle", "TLDR_North", "TLDR_South", "NodeAxisArticle",
  "ExactIngressCopy", "Article", "LilithArticle", "Headline", "Body", "CanonicalShort", "OverlayBody", "FallbackHookOverlay", "Copy",
  "focus", "strategy", "ritual", "intention", "energy", "question", "completion", "positive_test",
  "Exact_Tagline", "Exact_Hook", "Exact_Lived", "Exact_Turn", "core_theme", "sign_jurisdiction",
  "lived_experience", "rulership_twist", "history_echo", "closing_charge", "weeklyHeadline", "weeklyOverview",
  "key_dates", "rising_horoscopes", "moon_entry_aspect_units", "try_this", "mainShifts", "blocks"
]);
const editorFields = ["studio_content_type", "studio_editable_fields", "studio_read_only_fields"];
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function inheritedFields(baseline: Record<string, any>) {
  const paths = new Set([...readerFields, ...editorFields]);
  for (const field of baseline.studio_editable_fields ?? []) {
    const root = typeof field.path === "string" ? field.path.split(".")[0] : "";
    if (root && field.path.split(".").every((part: string) => /^[a-zA-Z0-9_-]+$/u.test(part) && !["__proto__", "constructor", "prototype"].includes(part))
      && !/^(?:owner_|review_|serving_|studio_|source_|approval|protected|content_boundary|copy_protection|contentKey$|ContentKey$|content_role$|surface$|render_policy$|grammar_frame$)/u.test(root)) paths.add(field.path);
  }
  return paths;
}

function ownValue(source: unknown, path: string): unknown {
  let current = source;
  for (const part of path.split(".")) {
    if (!object(current) || !Object.hasOwn(current, part)) return undefined;
    current = current[part];
  }
  return current;
}

function baselineFor(contentKey: string, record: Record<string, unknown>) {
  if (isRetiredCompositionKey(contentKey) || record.review_status === "deprecated"
    || Object.hasOwn(record, "contentKey") && record.contentKey !== contentKey) return undefined;
  return servingPackageRecords.get(contentKey);
}

export function studioPackageSourceRecord(contentKey: string, record: Record<string, unknown>, draft: Record<string, unknown> = {}) {
  const baseline = baselineFor(contentKey, record);
  if (!baseline) return record;
  // Keep the existing placement policy: recover fallback, without installing
  // an older shared article over a motion-specific writing workflow.
  if (baseline.studio_content_type === "continuous-placement") return skyPlacementStudioRecord(contentKey, {
    contentKey, planet: baseline.planet, sign: baseline.sign, studio_content_type: baseline.studio_content_type, ...record
  });
  const paths = inheritedFields(baseline);
  // Shared copy and You copy have legacy aliases. Filling a different alias
  // must not make an installed passage outrank a saved edit or intentional blank.
  const saved = { ...record, ...draft };
  const aliases = ["body", "body_you", "Body", "text"];
  const explicitAliases = aliases.filter(field => Object.hasOwn(saved, field));
  const defaults: Record<string, unknown> = {};
  for (const path of paths) {
    const root = path.split(".")[0];
    if (aliases.includes(root) && explicitAliases.some(field => field !== root)
      || root === "body_they" && explicitAliases.some(field => field !== "body_you")) continue;
    const value = ownValue(baseline, path);
    if (value === undefined) continue;
    const parts = path.split(".");
    let target = defaults;
    for (const part of parts.slice(0, -1)) {
      if (!object(target[part])) target[part] = {};
      target = target[part] as Record<string, unknown>;
    }
    target[parts.at(-1)!] = structuredClone(value);
  }
  return mergeStudioPackagePatch(defaults, record);
}

export function isApprovedStudioPackageField(contentKey: string, path: string, value: string) {
  const field = path.replace(/^packageDraft\./u, "");
  const baseline = servingPackageRecords.get(contentKey);
  if (!path.startsWith("packageDraft.") || !baseline || ![...inheritedFields(baseline)].some(allowed => field === allowed || field.startsWith(`${allowed}.`))
    || !isGovernedReaderEligible(baseline as any)) return false;
  return ownValue(baseline, field) === value;
}
