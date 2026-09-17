import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  DISCONNECTED_STUDIO_STYLESHEETS,
  SHIPPED_STUDIO_STYLESHEETS,
  studioClassInventory
} from "./studio-css-inventory.mjs";

const root = process.cwd();
const allowlistPath = "scripts/studio-css-unshipped-class-allowlist.json";
const allowedScriptReaders = new Set([
  "scripts/studio-css-inventory.mjs",
  "scripts/run-studio-css-class-coverage-audit.mjs"
]);

const inventory = await studioClassInventory(root);
const allowlist = JSON.parse(await readFile(path.join(root, allowlistPath), "utf8"));

assert.deepEqual(
  [...SHIPPED_STUDIO_STYLESHEETS].sort(),
  ["admin-theme.css", "studio-system.css"],
  "Content Studio ships only the theme and system sheets"
);

async function listFiles(directory, test) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(file, test));
    else if (test(entry.name)) files.push(file);
  }
  return files;
}

const findings = [];
const disconnectedNames = DISCONNECTED_STUDIO_STYLESHEETS.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
const disconnectedImport = new RegExp(`["'].*(?:${disconnectedNames})["']`);
for (const file of await listFiles(path.join(root, "apps"), (name) => /\.[jt]sx?$/u.test(name))) {
  const source = await readFile(file, "utf8");
  if (disconnectedImport.test(source)) findings.push(`Disconnected Studio stylesheet import: ${path.relative(root, file)}`);
}

for (const file of await listFiles(path.join(root, "scripts"), (name) => /\.[jt]sx?$|\.mjs$|\.mts$/u.test(name))) {
  const relative = path.relative(root, file);
  if (allowedScriptReaders.has(relative.replaceAll(path.sep, "/"))) continue;
  const source = await readFile(file, "utf8");
  for (const name of DISCONNECTED_STUDIO_STYLESHEETS) {
    if (source.includes(`apps/admin/src/${name}`) || source.includes(`../apps/admin/src/${name}`)) {
      findings.push(`Script treats disconnected Studio CSS as live: ${relative} → ${name}`);
    }
  }
}

const extraOrphaned = inventory.orphanedStyled.filter((name) => !allowlist.orphanedStyled.includes(name));
const extraNever = inventory.neverStyled.filter((name) => !allowlist.neverStyled.includes(name));
const shippedOrphaned = allowlist.orphanedStyled.filter((name) => !inventory.orphanedStyled.includes(name));
const shippedNever = allowlist.neverStyled.filter((name) => !inventory.neverStyled.includes(name));

if (extraOrphaned.length) {
  findings.push(`New classes styled only in disconnected CSS: ${extraOrphaned.join(", ")}`);
}
if (extraNever.length) {
  findings.push(`New Studio classes missing from studio-system.css: ${extraNever.join(", ")}`);
}
if (shippedOrphaned.length) {
  findings.push(`Allowlist still lists classes that now ship or were removed: ${shippedOrphaned.join(", ")}`);
}
if (shippedNever.length) {
  findings.push(`Allowlist still lists unstyled hooks that now ship or were removed: ${shippedNever.join(", ")}`);
}

assert.deepEqual(findings, [], findings.join("\n"));
console.log(
  `Studio class coverage passed: ${inventory.used.length} markup classes; ${inventory.orphanedStyled.length} frozen disconnected-styled; ${inventory.neverStyled.length} frozen unstyled hooks.`
);
