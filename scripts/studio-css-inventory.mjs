import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";

export const SHIPPED_STUDIO_STYLESHEETS = ["studio-system.css", "admin-theme.css"];

export const DISCONNECTED_STUDIO_STYLESHEETS = [
  "admin-access-feedback.css",
  "admin-components.css",
  "admin-content-studio-editor-redesign.css",
  "admin-content-studio-layout.css",
  "admin-content-studio-ux-compat.css",
  "admin-form-density.css",
  "admin-row-selection.css",
  "admin.css",
  "memory-graph.css",
  "studio-component-consistency.css",
  "studio-typography.css"
];

export const STUDIO_SOURCE_ROOT = "apps/admin/src";

async function listFiles(directory, test) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(file, test));
    else if (test(entry.name, file)) files.push(file);
  }
  return files;
}

export function classesFromCss(css) {
  const names = new Set();
  postcss.parse(css).walkRules((rule) => {
    for (const match of rule.selector.matchAll(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g)) {
      names.add(match[1]);
    }
  });
  return names;
}

function addClassTokens(names, value) {
  for (const token of String(value).split(/\s+/u)) {
    if (/^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/u.test(token) && !token.endsWith("-")) names.add(token);
  }
}

export function classesFromSource(source) {
  const names = new Set();
  for (const match of source.matchAll(/\bclassName\s*=\s*(?:\{\s*)?(["'`])([\s\S]*?)\1/g)) {
    if (match[1] === "`") {
      for (const part of match[2].split(/\$\{[\s\S]*?\}/u)) addClassTokens(names, part);
    } else addClassTokens(names, match[2]);
  }
  for (const match of source.matchAll(/\bclassName\s*=\s*\{\s*(?:[\w.]+)?\(([^)]*)\)/g)) {
    for (const inner of match[1].matchAll(/(["'])([^"']+)\1/g)) addClassTokens(names, inner[2]);
  }
  return names;
}

export async function studioClassInventory(root = process.cwd()) {
  const adminSrc = path.join(root, STUDIO_SOURCE_ROOT);
  const cssFiles = (await listFiles(adminSrc, (name) => name.endsWith(".css"))).sort();
  const sourceFiles = await listFiles(adminSrc, (name) => /\.[jt]sx?$/u.test(name));
  const shippedClasses = new Set();
  const disconnectedClasses = new Set();
  const presentDisconnected = [];
  const missingDisconnected = [];

  for (const file of cssFiles) {
    const base = path.basename(file);
    const names = classesFromCss(await readFile(file, "utf8"));
    if (SHIPPED_STUDIO_STYLESHEETS.includes(base)) {
      for (const name of names) shippedClasses.add(name);
    }
  }

  for (const base of DISCONNECTED_STUDIO_STYLESHEETS) {
    const file = path.join(adminSrc, base);
    try {
      const names = classesFromCss(await readFile(file, "utf8"));
      presentDisconnected.push(base);
      for (const name of names) disconnectedClasses.add(name);
    } catch (error) {
      if (error && error.code === "ENOENT") missingDisconnected.push(base);
      else throw error;
    }
  }

  const used = new Set();
  for (const file of sourceFiles) {
    for (const name of classesFromSource(await readFile(file, "utf8"))) used.add(name);
  }

  const orphanedStyled = [...used].filter((name) => !shippedClasses.has(name) && disconnectedClasses.has(name)).sort();
  const neverStyled = [...used].filter((name) => !shippedClasses.has(name) && !disconnectedClasses.has(name)).sort();

  return {
    cssFiles: cssFiles.map((file) => path.relative(root, file)),
    presentDisconnected,
    missingDisconnected,
    used: [...used].sort(),
    shippedClasses: [...shippedClasses].sort(),
    orphanedStyled,
    neverStyled
  };
}
