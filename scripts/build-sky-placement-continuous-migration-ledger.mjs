#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/sky-placement-continuous-migration-v1");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));

const inventory = readJson("packages/astro-knowledge/review/sky-placement-deep-audit-2026-08-15/inventory.json");
const evidence = readJson("packages/astro-knowledge/review/writing-pipeline-v3/shared-evidence-index-v1.json");
const legacyTemplates = new Set([
  "sky-placement-frame-v3",
  "fallback-template/sky.placement-article",
  "sky-placement-standalone-hook-v1"
]);
const targets = inventory.servingInventory.pages
  .filter((page) => legacyTemplates.has(page.templateKey))
  .map((page) => {
    const indexKey = page.page.replace("/", "|");
    const roles = evidence.byPlanetSign[indexKey] ?? {};
    return {
      page_key: page.page,
      current_template: page.templateKey,
      target_template: "sky-placement-continuous-v2",
      writing_family: page.page === "sun/virgo" ? "fast-mover-article" : "slow-mover-article",
      status: "evidence-preflight",
      owner_approval: "not_requested",
      serving_transition: "not_authorized",
      evidence: {
        meaning: roles.meaning?.length ?? 0,
        scene: roles.scene?.length ?? 0,
        argument: roles.argument?.length ?? 0,
        register_pool: evidence.byPlanetSign["*|*"]?.register?.length ?? evidence.counts.register,
        phrase_pool: evidence.byPlanetSign["*|*"]?.phrase?.length ?? evidence.counts.phrase
      }
    };
  });

if (targets.length !== 101) throw new Error(`Expected 101 migration targets (100 legacy pages plus quarantined Sun/Virgo); found ${targets.length}.`);
if (targets.some((target) => target.page_key.startsWith("moon/"))) throw new Error("Moon entries must not enter the continuous migration ledger.");
if (targets.some((target) => target.evidence.meaning === 0)) {
  throw new Error(`Meaning evidence is missing for: ${targets.filter((target) => target.evidence.meaning === 0).map((target) => target.page_key).join(", ")}`);
}
if (targets.some((target) => target.evidence.argument === 0)) {
  throw new Error(`Argument evidence is missing for: ${targets.filter((target) => target.evidence.argument === 0).map((target) => target.page_key).join(", ")}`);
}

const document = {
  schema: "sky-placement-continuous-migration-v1",
  generated_at: null,
  policy: {
    current_copy_changes: 0,
    billed_calls: 0,
    replacement_status: "needs_review until exact owner approval",
    serving_rule: "existing approved page remains selected until an approved continuous-v2 row exists",
    moon_rule: "sky-placement-moon-entry-v1 remains intentional and is excluded"
  },
  counts: {
    total_pages: inventory.servingInventory.pages.length,
    protected_continuous: inventory.servingInventory.pages.filter((page) => page.templateKey === "sky-placement-continuous-v2").length,
    protected_moon: inventory.servingInventory.pages.filter((page) => page.templateKey === "sky-placement-moon-entry-v1").length,
    migration_targets: targets.length,
    framed_targets: targets.filter((target) => target.current_template === "sky-placement-frame-v3").length,
    lilith_targets: targets.filter((target) => target.current_template === "fallback-template/sky.placement-article").length,
    quarantined_standalone_targets: targets.filter((target) => target.current_template === "sky-placement-standalone-hook-v1").length,
    zero_meaning: targets.filter((target) => target.evidence.meaning === 0).length,
    zero_scene: targets.filter((target) => target.evidence.scene === 0).length,
    zero_argument: targets.filter((target) => target.evidence.argument === 0).length
  },
  targets
};

const markdown = `# Sky Placement continuous migration v1\n\n`+
  `Status: **evidence preflight; no prose changes; no billed calls**\n\n`+
  `- Existing continuous-v2 pages preserved: **${document.counts.protected_continuous}**\n`+
  `- Intentional Moon-entry pages preserved: **${document.counts.protected_moon}**\n`+
  `- Pages to replace: **${document.counts.migration_targets}** (${document.counts.framed_targets} framed, ${document.counts.lilith_targets} Lilith four-slot, ${document.counts.quarantined_standalone_targets} quarantined standalone)\n`+
  `- Targets missing meaning evidence: **${document.counts.zero_meaning}**\n`+
  `- Targets missing argument evidence: **${document.counts.zero_argument}**\n`+
  `- Targets with no indexed scene evidence: **${document.counts.zero_scene}**\n\n`+
  `A missing scene lane is recorded, not silently filled from an unrelated house or sign. `+
  `The writing pipeline may use constrained ordinary scenes only where no approved scene source exists.\n\n`+
  `Current approved pages remain selected until exact replacement wording and its staged-to-serving transition receive owner approval.\n\n`+
  `## Required renderer preparation\n\n`+
  `- Lilith selects the continuous-v2 renderer only when an approved continuous row exists; otherwise its current approved four-slot page remains selected.\n`+
  `- Lilith is admitted to the slow-mover era layer so an approved continuous article can render its era frame, handoff, recurrence, older analogs, and collective lesson without a SOURCE_GAP.\n`+
  `- A route-level regression proves both the legacy-preserving state and the approved continuous-row cutover, including the era layer.\n`;

fs.mkdirSync(reviewRoot, { recursive: true });
fs.writeFileSync(path.join(reviewRoot, "migration-ledger.json"), `${JSON.stringify(document, null, 2)}\n`);
fs.writeFileSync(path.join(reviewRoot, "README.md"), markdown);
console.log(JSON.stringify(document.counts, null, 2));
