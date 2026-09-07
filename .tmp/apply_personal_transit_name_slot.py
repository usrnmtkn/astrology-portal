from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# Content Studio: keep the authored-first label correction from PR #641.
path = "apps/admin/src/transitNatalSources.ts"
replace_once(path,
    '      label: "Alternate complete write-up (advanced, shared across signs & houses)",',
    '      label: "Complete Personal Transit write-up (shared across signs & houses)",')
replace_once(path,
    '      description: "Shared across all signs and houses. Current sign, Transit house, and Natal house update the reader preview above, but they do not change this standalone source. To open a different standalone row, change the Transiting planet, Natal planet or point, or move to a different hard/soft aspect family. Two exact aspects can still share the same row when they belong to the same family. This write-up is used only when the four-part Personal Transit cannot be completed, or when the transit is opened without house information.",',
    '      description: "The authored passage below is the primary reader-facing transit-to-natal write-up when an eligible authored row exists. It is shared across all signs and houses; Current sign, Transit house, and Natal house update the reader preview above but do not change this source. Change the Transiting planet, Natal planet or point, or hard/soft aspect family to open a different authored row. The template beside it is fallback-only and is used when no eligible authored passage can render.",')
replace_once(path,
    '          label: `Standalone ${planet} ${selection.aspect} ${natalPoint} passage`,',
    '          label: `Primary ${planet} ${selection.aspect} ${natalPoint} passage`,')
replace_once(path,
    '          scope: "Shared across all signs and houses. Current sign, Transit house, and Natal house affect the preview above, not this row. The row is keyed by transiting planet, natal point, and hard/soft aspect family, so changing the exact aspect can also keep the same source when it stays in the same family. The editor exposes separate You and Friends passages so each reader voice can be authored directly.",',
    '          scope: "Primary authored transit-to-natal passage when an eligible authored row exists. It is shared across all signs and houses. Current sign, Transit house, and Natal house affect the preview above, not this row. The row is keyed by transiting planet, natal point, and hard/soft aspect family, so changing the exact aspect can keep the same source when it stays in the same family. The editor exposes separate You and Friends passages so each reader voice can be authored directly.",')
replace_once(path,
    '          label: "Standalone transit-aspect template",',
    '          label: "Fallback transit-aspect template",')
replace_once(path,
    '          scope: "Controls the fallback sentence order for transit-to-natal pages without a complete authored passage.",',
    '          scope: "Controls the fallback sentence order for transit-to-natal pages without a complete eligible authored passage.",')
replace_once(path,
    '      body: "This Personal Transit is incomplete. Add or repair the missing passages below; the reader app will use its alternate complete write-up until all four passages are available.",',
    '      body: "This Personal Transit is incomplete. Add or repair the missing passages below. The reader app can still use the complete authored passage when an eligible one is available.",')

# Content Studio variable reference: make {{Name}} understandable in the Variables rail.
path = "apps/admin/src/templateVariableReference.ts"
replace_once(path,
    'const variableDefinitions: Record<string, VariableDefinition> = {\n  possessive: {',
    'const variableDefinitions: Record<string, VariableDefinition> = {\n  Name: {\n    meaning: "The selected friend’s display name in a Friends Personal Transit.",\n    example: "Avery",\n    source: "Calculated viewer context"\n  },\n  possessive: {')

# Admin publish validation: {{Name}} is allowed only in Friends/They copy for these Personal Transit effect families.
path = "api/admin/generated-content.ts"
replace_once(path,
    '''function normalizeNatalAspectTheyNameVariable(contentKey: string | undefined, value: unknown) {
  const supportsNamedFriendCopy = Boolean(
    contentKey?.startsWith("fallback-hook/natal-aspect-lived/")
    || contentKey?.startsWith("authored/transit-aspect/")
  );
  if (!supportsNamedFriendCopy || typeof value !== "string") return value;
  return value.replace(/\{\{Name\}\}|\{Name\}/gu, "{{Name}}");
}''',
    '''function supportsNamedFriendCopy(contentKey: string | undefined) {
  const key = contentKey ?? "";
  return key.startsWith("fallback-hook/natal-aspect-lived/")
    || key.startsWith("authored/transit-aspect/")
    || /^fallback-hook\\/transit-effect-(?:soft|hard)\\//u.test(key)
    || key.startsWith("fallback-hook/transit-house-event-scenes/");
}

function normalizeNatalAspectTheyNameVariable(contentKey: string | undefined, value: unknown) {
  if (!supportsNamedFriendCopy(contentKey) || typeof value !== "string") return value;
  return value.replace(/\{\{Name\}\}|\{Name\}/gu, "{{Name}}");
}''')
replace_once(path,
    '''      const isAllowedFriendName = (
        row.content_key.startsWith("fallback-hook/natal-aspect-lived/")
        || row.content_key.startsWith("authored/transit-aspect/")
      )
        && field.endsWith("body_they")
        && slot === "{{Name}}";''',
    '''      const isAllowedFriendName = supportsNamedFriendCopy(row.content_key)
        && field.endsWith("body_they")
        && slot === "{{Name}}";''')

# Promotion governance: Name is optional and Friends-only for transit-effect / scene hooks.
path = "scripts/lib/content-template-slot-governance.mjs"
replace_once(path,
    '''  const dailyFriendField = /^fallback-hook\\/daily-(?:headline|body)\\//u.test(String(contentKey))
    && textField === "body_they";
  const allowedSlots = new Set(slotContract?.allowedSlots ?? (
    dailyFriendField
      ? [...new Set([...beforeSlots, ...DAILY_GLANCE_PERSON_SLOT_KEYS])]
      : beforeSlots
  ));
  const requiredSlots = new Set(slotContract?.requiredSlots ?? beforeSlots);
  const supportedSlots = new Set(familySupportedSlots ?? (
    dailyFriendField ? DAILY_GLANCE_PERSON_SLOT_KEYS : beforeSlots
  ));''',
    '''  const dailyFriendField = /^fallback-hook\\/daily-(?:headline|body)\\//u.test(String(contentKey))
    && textField === "body_they";
  const transitFriendNameField = (
    /^fallback-hook\\/transit-effect-(?:soft|hard)\\//u.test(String(contentKey))
    || /^fallback-hook\\/transit-house-event-scenes\\//u.test(String(contentKey))
  ) && textField === "body_they";
  const allowedSlots = new Set(slotContract?.allowedSlots ?? (
    dailyFriendField
      ? [...new Set([...beforeSlots, ...DAILY_GLANCE_PERSON_SLOT_KEYS])]
      : transitFriendNameField
        ? [...new Set([...beforeSlots, "Name"])]
        : beforeSlots
  ));
  const requiredSlots = new Set(slotContract?.requiredSlots ?? beforeSlots);
  const supportedSlots = new Set(familySupportedSlots ?? (
    dailyFriendField
      ? DAILY_GLANCE_PERSON_SLOT_KEYS
      : transitFriendNameField
        ? [...new Set([...beforeSlots, "Name"])]
        : beforeSlots
  ));''')

# Resolver behavior: materialize {{Name}} only for friend voice, leaving You misuse unresolved/fail-loud.
node_path = "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs"
replace_once(node_path,
    'const fillKeep = (body, ctx) => body.replace(/\\{\\{([\\w.]+)\\}\\}/g, (_, k) => ctx[k] ?? `{{${k}}}`).trim();',
    'const fillKeep = (body, ctx) => body.replace(/\\{\\{([\\w.]+)\\}\\}/g, (_, k) => ctx[k] ?? `{{${k}}}`).trim();\n\nexport function fillTransitFriendNameSlot(body, voice = "you") {\n  if (!body || voice === "you") return body;\n  return fillKeep(body, { Name: voice });\n}')
replace_once(node_path,
    '  const scenes = sceneKey ? hookVoice(sceneKey, v) : null;',
    '  const scenesRaw = sceneKey ? hookVoice(sceneKey, v) : null;\n  const scenes = scenesRaw ? fillTransitFriendNameSlot(scenesRaw, voice) : null;')
replace_once(node_path,
    '  const transitEffect = effectRaw && transitEffectArea ? fill(effectRaw, { natalArea: transitEffectArea }) : null;',
    '  const transitEffect = effectRaw && transitEffectArea ? fillTransitFriendNameSlot(fill(effectRaw, { natalArea: transitEffectArea }), voice) : null;')
replace_once(node_path,
    '''  const cScenes = hookVoice(`fallback-hook/transit-house-event-scenes/${transiting}/${natal}/${effectFamily}`, v)
    ?? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/${natal}`, v);
  const cScenesFinal = cScenes ?? ctx.transitTypeLine ?? null;''',
    '''  const cScenesRaw = hookVoice(`fallback-hook/transit-house-event-scenes/${transiting}/${natal}/${effectFamily}`, v)
    ?? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/${natal}`, v);
  const cScenes = cScenesRaw ? fillTransitFriendNameSlot(cScenesRaw, voice) : null;
  const cScenesFinal = cScenes ?? ctx.transitTypeLine ?? null;''')

browser_path = "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts"
replace_once(browser_path,
    '  const fillKeep = (body: string, ctx: Ctx): string => body.replace(/\\{\\{([\\w.]+)\\}\\}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : `{{${k}}}`)).trim();',
    '  const fillKeep = (body: string, ctx: Ctx): string => body.replace(/\\{\\{([\\w.]+)\\}\\}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : `{{${k}}}`)).trim();\n\n  function fillTransitFriendNameSlotLocal(body: string | null, voice: string = "you"): string | null {\n    if (!body || voice === "you") return body;\n    return fillKeep(body, { Name: voice });\n  }')
replace_once(browser_path,
    'export interface TransitLabelResult { label: string; noun: string; window: string }\n',
    'export interface TransitLabelResult { label: string; noun: string; window: string }\n\nexport function fillTransitFriendNameSlot(body: string | null, voice: string = "you"): string | null {\n  if (!body || voice === "you") return body;\n  return body.replace(/\\{\\{Name\\}\\}/gu, voice).trim();\n}\n')
replace_once(browser_path,
    '    const scenes = sceneKey ? hookVoice(sceneKey, v) : null;',
    '    const scenesRaw = sceneKey ? hookVoice(sceneKey, v) : null;\n    const scenes = scenesRaw ? fillTransitFriendNameSlotLocal(scenesRaw, voice) : null;')
replace_once(browser_path,
    '    const transitEffect = effectRaw && transitEffectArea ? fill(effectRaw, { natalArea: transitEffectArea }) : null;',
    '    const transitEffect = effectRaw && transitEffectArea ? fillTransitFriendNameSlotLocal(fill(effectRaw, { natalArea: transitEffectArea }), voice) : null;')
replace_once(browser_path,
    '''    const cScenes = hookVoice(`fallback-hook/transit-house-event-scenes/${transiting}/${natal}/${effectFamily}`, v)
      ?? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/${natal}`, v);
    const cScenesFinal = cScenes ?? ctx.transitTypeLine ?? null;''',
    '''    const cScenesRaw = hookVoice(`fallback-hook/transit-house-event-scenes/${transiting}/${natal}/${effectFamily}`, v)
      ?? hookVoice(`fallback-hook/transit-effect-${effectFamily}/${transiting}/${natal}`, v);
    const cScenes = cScenesRaw ? fillTransitFriendNameSlotLocal(cScenesRaw, voice) : null;
    const cScenesFinal = cScenes ?? ctx.transitTypeLine ?? null;''')

# Package version bump required for resolver behavior changes.
old_version = "v3-2026-09-04a"
new_version = "v3-2026-09-07a"
replace_once(
    "apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts",
    f'export const PACKAGE_VERSION = "{old_version}";',
    f'export const PACKAGE_VERSION = "{new_version}";'
)
for pattern in ("test-*.mjs", "test-*.mts", "test-*.ts"):
    for p in Path("scripts").glob(pattern):
        text = p.read_text()
        if old_version in text:
            p.write_text(text.replace(old_version, new_version))

# Content Studio contract tests.
path = "scripts/test-content-studio-transit-friend-editor.mjs"
replace_once(path,
    'assert.match(api, /authored\\/transit-aspect\\/[\\s\\S]{0,220}slot === "\\{\\{Name\\}\\}"/u);',
    'assert.match(api, /function supportsNamedFriendCopy[\\s\\S]{0,600}transit-effect-[\\s\\S]{0,600}transit-house-event-scenes/u);\nassert.match(api, /supportsNamedFriendCopy\\(row\\.content_key\\)[\\s\\S]{0,160}field\\.endsWith\\("body_they"\\)[\\s\\S]{0,160}slot === "\\{\\{Name\\}\\}"/u);')
replace_once(path,
    'assert.match(transitSources, /separate You and Friends passages/u);',
    'assert.match(transitSources, /separate You and Friends passages/u);\nassert.match(transitSources, /Complete Personal Transit write-up/u);')

path = "scripts/test-content-approval-governance.mjs"
marker = '''assert.equal(friendSlotPreflight.fixtures.every((fixture) => !fixture.rendered.includes("{{")), true);

'''
addition = '''assert.equal(friendSlotPreflight.fixtures.every((fixture) => !fixture.rendered.includes("{{")), true);

const transitFriendNamePreflight = buildTemplateSlotPreflight({
  beforeText: "They may respond more openly around {{natalArea}}.",
  afterText: "{{Name}} may respond more openly around {{natalArea}}.",
  contentKey: "fallback-hook/transit-effect-soft/sun/venus",
  textField: "body_they"
});
assert.deepEqual(transitFriendNamePreflight.addedSlots, ["Name"]);
assert.equal(transitFriendNamePreflight.allowedSlots.includes("Name"), true);
assert.equal(transitFriendNamePreflight.familySupportedSlots.includes("Name"), true);
assert.equal(transitFriendNamePreflight.renderPersonFixtures, false);
assert.throws(
  () => buildTemplateSlotPreflight({
    beforeText: "You may respond more openly around {{natalArea}}.",
    afterText: "{{Name}} may respond more openly around {{natalArea}}.",
    contentKey: "fallback-hook/transit-effect-soft/sun/venus",
    textField: "body_you"
  }),
  /PROMOTION_UNSUPPORTED_TEMPLATE_SLOT/u
);

'''
replace_once(path, marker, addition)

# Runtime source/browser/dist parity regression.
test_path = Path("scripts/test-transit-fallback-friend-name-slot.mjs")
if test_path.exists():
    raise SystemExit(f"{test_path} already exists")
test_path.write_text(r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";
import { fillTransitFriendNameSlot as nodeFillTransitFriendNameSlot } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(root, "apps/web/src/content/fallbackArchitectureV3");
const browserEntry = path.join(packageRoot, "resolver/renderTransitSynastry.browser.ts");
const distEntry = path.join(packageRoot, "dist/tldr-content.js");
const tempBundle = path.join(os.tmpdir(), `tldr-transit-friend-name-${process.pid}.mjs`);

await build({
  entryPoints: [browserEntry],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: tempBundle,
  logLevel: "silent"
});
const browserModule = await import(`${pathToFileURL(tempBundle).href}?t=${Date.now()}`);
const distModule = await import(`${pathToFileURL(distEntry).href}?t=${Date.now()}`);

const tokenized = "{{Name}} doesn't have to fake it to get a good reaction right now.";
for (const [label, fillName] of [
  ["Node source", nodeFillTransitFriendNameSlot],
  ["browser source", browserModule.fillTransitFriendNameSlot],
  ["shipped dist", distModule.fillTransitFriendNameSlot]
]) {
  assert.equal(fillName(tokenized, "Avery"), "Avery doesn't have to fake it to get a good reaction right now.", `${label} must materialize the selected friend's name.`);
  assert.equal(fillName(tokenized, "you"), tokenized, `${label} must leave a misplaced You-surface Name token unresolved.`);
}

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
const templates = readJson("templates/fallback-templates-v3.json");
const baseRows = readJson("source-rows/fallback-source-rows-v3.json");
const transitLib = { authoredCards: [] };

function rowsWithNamedSunVenusEffect() {
  const rows = structuredClone(baseRows);
  rows.hookRows = rows.hookRows.filter((row) => row.contentKey !== "fallback-hook/transit-house-event-scenes/sun/venus/soft");
  const effect = rows.hookRows.find((row) => row.contentKey === "fallback-hook/transit-effect-soft/sun/venus");
  assert.ok(effect, "Sun/Venus soft transit-effect fixture must exist.");
  effect.body_they = tokenized;
  effect.review_status = "approved";
  return rows;
}

const facts = {
  planet: "sun",
  sign: "virgo",
  house: 4,
  natal: "venus",
  natalHouse: 8,
  aspect: "trine",
  window: "until September 11",
  voice: "Avery"
};
const browserRendered = browserModule
  .createTransitSynastryRenderer(transitLib, templates, rowsWithNamedSunVenusEffect())
  .renderTransitHouseEvent(facts);
const distRendered = distModule
  .createTransitSynastryRenderer(transitLib, templates, rowsWithNamedSunVenusEffect())
  .renderTransitHouseEvent(facts);

for (const [label, rendered] of [["browser source", browserRendered], ["shipped dist", distRendered]]) {
  assert.match(rendered.body, /Avery doesn't have to fake it/u, `${label} Personal Transit must render the friend name from the fallback hook.`);
  assert.doesNotMatch(rendered.body, /\{\{Name\}\}/u, `${label} Personal Transit must not leak the Name token.`);
}
assert.equal(browserRendered.body, distRendered.body, "Browser source and shipped dist must render the same named Friends fallback passage.");

console.log("Personal Transit fallback Friends {{Name}} slot contract passed.");
''')

# Keep the regression in the ordinary content suite.
path = "package.json"
replace_once(path,
    'node scripts/test-content-studio-transit-friend-editor.mjs && node scripts/test-fallback-refresh-wiring.mjs',
    'node scripts/test-content-studio-transit-friend-editor.mjs && node scripts/test-transit-fallback-friend-name-slot.mjs && node scripts/test-fallback-refresh-wiring.mjs')
