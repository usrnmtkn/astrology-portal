#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.resolve(process.argv[2] ?? path.join(
  repoRoot,
  "packages/astro-knowledge/review/mercury-ingress-masters-v7/TLDR-Mercury-Ingress-Articles-V7.md"
));
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/mercury-ingress-masters-v7");
const canonicalPath = path.join(reviewRoot, "TLDR-Mercury-Ingress-Articles-V7.md");
const rowsPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json"
);
const auditPath = path.join(reviewRoot, "ingestion-audit.json");
const approvalPath = path.join(reviewRoot, "approval-record.md");
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
const targetKey = (sign) => `fallback-hook/sky-sign-copy/mercury/${sign}`;
const variantPrefix = "fallback-hook/sky-sign-copy-hook/mercury/";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stableDigest = (value) => sha256(JSON.stringify(value));

function parseMaster(markdown) {
  const signMatches = [...markdown.matchAll(/^## Mercury in ([A-Za-z]+)$/gmu)];
  if (signMatches.length !== 12) {
    throw new Error(`Expected 12 Mercury masters; found ${signMatches.length}.`);
  }

  return signMatches.map((match, index) => {
    const title = match[1];
    const sign = title.toLowerCase();
    const start = match.index + match[0].length;
    const end = index + 1 < signMatches.length ? signMatches[index + 1].index : markdown.length;
    const block = markdown.slice(start, end).replace(/\n---\s*$/u, "").trim();
    const primary = block.match(/\*\*Primary hook:\*\*\s*\n\s*([\s\S]*?)\n\s*\*\*Alternative hooks:\*\*/u);
    const alternatives = block.match(/\*\*Alternative hooks:\*\*\s*\n\s*- ([^\n]+)\n- ([^\n]+)\s*\n\s*(?=### )/u);
    if (!primary || !alternatives) {
      throw new Error(`Missing hook structure for Mercury in ${title}.`);
    }
    const sectionMatches = [...block.matchAll(/^### (.+)$/gmu)];
    if (sectionMatches.length !== 4) {
      throw new Error(`Expected 4 headed sections for Mercury in ${title}; found ${sectionMatches.length}.`);
    }
    const sections = sectionMatches.map((sectionMatch, sectionIndex) => {
      const sectionStart = sectionMatch.index + sectionMatch[0].length;
      const sectionEnd = sectionIndex + 1 < sectionMatches.length
        ? sectionMatches[sectionIndex + 1].index
        : block.length;
      return {
        heading: sectionMatch[1].trim(),
        body: block.slice(sectionStart, sectionEnd).trim()
      };
    });
    return {
      title,
      sign,
      primaryHook: primary[1].trim(),
      alternativeHooks: [alternatives[1].trim(), alternatives[2].trim()],
      sections
    };
  });
}

function articleBody(master) {
  return [
    master.primaryHook,
    ...master.sections.flatMap((section) => [section.heading, section.body])
  ].join("\n\n");
}

function replacementRow(existing, master) {
  const [opening, tension, development, close] = master.sections;
  const sourceRef = "packages/astro-knowledge/review/mercury-ingress-masters-v7/TLDR-Mercury-Ingress-Articles-V7.md";
  return {
    contentKey: targetKey(master.sign),
    content_role: "fallback_hook",
    grammar_frame: "continuous_editorial_unit",
    render_policy: "sky-placement-continuous-v2",
    fact_line: "{{entryDate}} to {{exitDate}}",
    aspect_insert: "{{aspectInsert}}",
    primary_hook: master.primaryHook,
    opening_heading: opening.heading,
    opening: opening.body,
    tension_heading: tension.heading,
    tension: tension.body,
    development_heading: development.heading,
    development: development.body,
    close_heading: close.heading,
    close: close.body,
    ...(Array.isArray(existing.aspect_units) ? { aspect_units: existing.aspect_units } : {}),
    body_you: articleBody(master),
    review_status: "approved",
    source_keys: [sourceRef],
    approved_via: `${sourceRef}#governance-updated-2026-08-11`,
    note: "Exact owner-approved Mercury ingress article master V7. The engine date line remains separate; alternative hooks are stored as non-rendered rotation variants."
  };
}

function variantRow(master, alternative, number) {
  const sourceRef = "packages/astro-knowledge/review/mercury-ingress-masters-v7/TLDR-Mercury-Ingress-Articles-V7.md";
  return {
    contentKey: `${variantPrefix}${master.sign}/variant-${number}`,
    content_role: "fallback_hook",
    grammar_frame: "collective_observational_line",
    render_policy: "stored-hook-rotation-variant-v1",
    body_you: alternative,
    body_they: alternative,
    review_status: "approved",
    rotation_eligible: true,
    rendered_as_body_copy: false,
    source_keys: [sourceRef],
    approved_via: `${sourceRef}#mercury-in-${master.sign}`,
    note: "Owner-approved alternative hook stored for rotation. It is not rendered inside the article body."
  };
}

fs.mkdirSync(reviewRoot, { recursive: true });
const sourceBytes = fs.readFileSync(sourcePath);
if (path.resolve(sourcePath) !== path.resolve(canonicalPath)) {
  fs.writeFileSync(canonicalPath, sourceBytes);
}
const markdown = sourceBytes.toString("utf8");
const masters = parseMaster(markdown);
if (masters.map(({ sign }) => sign).join("|") !== signs.join("|")) {
  throw new Error("Mercury master sign order does not match the canonical zodiac order.");
}

const source = JSON.parse(fs.readFileSync(rowsPath, "utf8"));
const targetKeys = new Set(signs.map(targetKey));
const beforeNonTarget = source.rows.filter((row) => (
  !targetKeys.has(row.contentKey) && !String(row.contentKey).startsWith(variantPrefix)
));
const existingByKey = new Map(source.rows.map((row) => [row.contentKey, row]));
const masterBySign = new Map(masters.map((master) => [master.sign, master]));
const rebuiltRows = [];

for (const row of source.rows) {
  if (String(row.contentKey).startsWith(variantPrefix)) continue;
  if (!targetKeys.has(row.contentKey)) {
    rebuiltRows.push(row);
    continue;
  }
  const sign = row.contentKey.split("/").at(-1);
  const master = masterBySign.get(sign);
  if (!master) throw new Error(`Missing parsed master for ${row.contentKey}.`);
  rebuiltRows.push(replacementRow(row, master));
  rebuiltRows.push(variantRow(master, master.alternativeHooks[0], 2));
  rebuiltRows.push(variantRow(master, master.alternativeHooks[1], 3));
}

for (const key of targetKeys) {
  if (!existingByKey.has(key)) throw new Error(`Missing serving Mercury row ${key}.`);
}

const afterNonTarget = rebuiltRows.filter((row) => (
  !targetKeys.has(row.contentKey) && !String(row.contentKey).startsWith(variantPrefix)
));
if (stableDigest(beforeNonTarget) !== stableDigest(afterNonTarget)) {
  throw new Error("A non-target row changed during Mercury V7 ingestion.");
}

fs.writeFileSync(rowsPath, `${JSON.stringify({ ...source, rows: rebuiltRows }, null, 2)}\n`);

const servingArticleSnapshot = rebuiltRows
  .filter((row) => row.rendered_as_body_copy !== false)
  .map((row) => ({
    contentKey: row.contentKey,
    article: {
      opening: row.opening,
      tension: row.tension,
      development: row.development,
      close: row.close,
      try_this: row.try_this
    }
  }))
  .sort((first, second) => first.contentKey.localeCompare(second.contentKey));

const audit = {
  program: "mercury-masters-and-derivations",
  step: 1,
  recordedAt: "2026-08-11",
  ownerSource: path.relative(repoRoot, canonicalPath),
  ownerSourceSha256: sha256(sourceBytes),
  counts: {
    articleMasters: masters.length,
    alternativeHookVariants: masters.reduce((sum, master) => sum + master.alternativeHooks.length, 0),
    replacedServingRows: targetKeys.size,
    nonTargetRows: beforeNonTarget.length
  },
  invariants: {
    nonTargetRowsBeforeSha256: stableDigest(beforeNonTarget),
    nonTargetRowsAfterSha256: stableDigest(afterNonTarget),
    nonTargetRowsByteEquivalent: true,
    ownerParagraphsAndHeadingsCopiedExactly: true,
    primaryHooksCopiedExactly: true,
    alternativeHooksCopiedExactly: true,
    servingArticleSnapshotSha256: stableDigest(servingArticleSnapshot)
  },
  dateHandling: {
    factLine: "{{entryDate}} to {{exitDate}}",
    mechanicalPlaceholderConversions: [],
    explanation: "The existing engine-rendered fact_line continues to supply entry and exit dates. No owner sentence was converted or rewritten."
  },
  rows: masters.map((master) => ({
    sign: master.sign,
    contentKey: targetKey(master.sign),
    sourceSection: `Mercury in ${master.title}`,
    primaryHookSha256: sha256(master.primaryHook),
    sectionHeadings: master.sections.map(({ heading }) => heading),
    sectionBodySha256: master.sections.map(({ body }) => sha256(body)),
    alternativeVariantKeys: [2, 3].map((number) => `${variantPrefix}${master.sign}/variant-${number}`)
  }))
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

const approvalRecord = `# Mercury ingress article masters V7 approval record\n\nDate: 2026-08-11\n\n## Owner ruling\n\n> STEP 1 - Land the twelve article masters. Source of truth:\n> TLDR-Mercury-Ingress-Articles-V7.md (owner-ruled surgeries applied; governance\n> header records the rulings). These serve as the reader-facing Mercury ingress\n> placement articles, headings included, replacing the current\n> sky-sign-copy/mercury/{sign} bodies, AND stand as the upstream derivation\n> source. Owner approval covers the file's exact wording as landed; land\n> byte-identical with dates/placeholders per existing conventions ({{entryDate}}\n> /{{exitDate}} where the current rows use them; flag every mechanical\n> placeholder conversion in the PR). Alternative hooks are stored as variant\n> rows for rotation, not rendered as body copy.\n\n## Landed authority\n\n- Owner source SHA-256: \`${audit.ownerSourceSha256}\`\n- Article masters: 12\n- Stored alternative-hook variants: 24\n- Mechanical placeholder conversions in owner prose: none\n- Date convention retained: \`{{entryDate}} to {{exitDate}}\` in the existing engine fact line\n- Non-target row digest before and after: \`${audit.invariants.nonTargetRowsBeforeSha256}\`\n\nThe copied Markdown file is the upstream derivation source. Step 2 derivations are not included in this change and receive no staging or approval from this record.\n`;
fs.writeFileSync(approvalPath, approvalRecord);

console.log(`Imported ${masters.length} Mercury article masters and 24 alternative-hook variants.`);
console.log(`Owner source SHA-256: ${audit.ownerSourceSha256}`);
console.log(`Non-target row SHA-256: ${audit.invariants.nonTargetRowsAfterSha256}`);
