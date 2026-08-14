#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const stylesRoot = path.join(root, "apps/web/src");
const entryPath = path.join(stylesRoot, "styles.css");
const themePath = path.join(stylesRoot, "styles/theme.css");
const fontsPath = path.join(stylesRoot, "styles/fonts.css");
const calendarPath = path.join(stylesRoot, "styles/lunar-calendar.css");
const cardSystemsPath = path.join(stylesRoot, "styles/card-systems.css");

async function collectCssFiles(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry);
    const entryStat = await stat(absolute);
    if (entryStat.isDirectory()) files.push(...await collectCssFiles(absolute));
    else if (absolute.endsWith(".css")) files.push(absolute);
  }

  return files;
}

function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function ruleBlocks(source) {
  return [...source.matchAll(/([^{}]+)\{([^{}]+)\}/g)].map((match) => ({
    selector: match[1].trim().replace(/\s+/g, " "),
    body: match[2]
  }));
}

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const [entry, theme, fonts, calendar, cardSystems, cssFiles] = await Promise.all([
  readFile(entryPath, "utf8"),
  readFile(themePath, "utf8"),
  readFile(fontsPath, "utf8"),
  readFile(calendarPath, "utf8"),
  readFile(cardSystemsPath, "utf8"),
  collectCssFiles(stylesRoot)
]);

const imports = [...entry.matchAll(/@import\s+url\("([^"]+)"\);/g)].map((match) => match[1]);
check(imports[0] === "./styles/fonts.css", "fonts.css must be the first stylesheet import.");
check(imports.at(-1) === "./styles/consistency.css", "consistency.css must be the final stylesheet import.");

const allCss = (await Promise.all(cssFiles.map(async (file) => ({
  file,
  source: await readFile(file, "utf8")
}))));

check(
  allCss.every(({ source }) => !/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(source)),
  "Remote Google Font URLs are not allowed; fonts must be self-hosted."
);

for (const family of ["Geist Variable", "Newsreader Variable", "Noto Sans Symbols 2", "Atkinson Hyperlegible"]) {
  check(fonts.includes(`font-family: "${family}"`), `Missing self-hosted @font-face for ${family}.`);
}

for (const sourceFragment of [
  "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  "@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2",
  "@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff2",
  "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2",
  "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2"
]) {
  check(fonts.includes(sourceFragment), `Missing required local font source: ${sourceFragment}`);
}

for (const role of [
  "--font-display: var(--font-serif);",
  "--font-body: var(--font-sans);",
  "--font-label: var(--font-sans);",
  "--font-ui: var(--font-sans);",
  "--font-data: var(--font-mono);",
  "--font-glyph: var(--font-symbol);",
  "--font-brand: var(--font-sans);"
]) {
  check(theme.includes(role), `Missing canonical font role: ${role}`);
}

for (const size of [
  "--type-body-size: 16px;",
  "--type-description-size: 15px;",
  "--type-meta-size: 13px;",
  "--type-label-size: 12px;",
  "--type-hint-size: 12px;"
]) {
  check(theme.includes(size), `Shared readable type scale changed below its contract: ${size}`);
}

for (const cardTypeContract of [
  "--natal-card-body-size: var(--text-description);",
  "--aspect-card-body-size: var(--text-description);",
  "--natal-card-padding: var(--space-5);",
  "--aspect-card-padding: var(--space-5);"
]) {
  check(theme.includes(cardTypeContract), `Shared natal/aspect card contract changed: ${cardTypeContract}`);
}

check(
  cardSystems.includes("--natal-card-padding: var(--space-5);")
    && cardSystems.includes("--aspect-card-padding: var(--space-5);"),
  "Route-level card systems must preserve the compact shared desktop padding."
);

for (const { file, source } of allCss) {
  if (file === themePath) continue;
  const clean = withoutComments(source);
  const literalColor = clean.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\(/i);
  check(!literalColor, `${path.relative(root, file)} contains a literal color outside theme.css: ${literalColor?.[0] ?? ""}`);

  if (file === fontsPath) continue;
  for (const block of ruleBlocks(clean)) {
    const declarations = [...block.body.matchAll(/font-family\s*:\s*([^;]+)/g)];
    for (const declaration of declarations) {
      const value = declaration[1].trim();
      check(
        value === "inherit" || /^var\(--[\w-]+\)$/.test(value),
        `${path.relative(root, file)} uses an unowned font stack in ${block.selector}: ${value}`
      );

      if (value === "var(--font-mono)") {
        check(
          /(?:orb|degree|coordinate|timezone|friends-invite-(?:visible-link|history-row strong|history-link))/.test(block.selector),
          `${path.relative(root, file)} uses monospace for non-data content in ${block.selector}.`
        );
      }
    }
  }
}

for (const responsiveContract of [
  "overflow-x: auto;",
  "scroll-snap-type: inline proximity;",
  "flex: 0 0 112px;",
  "min-width: 112px;"
]) {
  check(calendar.includes(responsiveContract), `Mobile Calendar readability contract is missing: ${responsiveContract}`);
}

if (failures.length > 0) {
  console.error("Web design-system contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Web design-system contract passed (${cssFiles.length} CSS files checked).`);
}
