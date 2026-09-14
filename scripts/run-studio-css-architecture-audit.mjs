import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';

// Audit the shipped Studio system, not disconnected historical stylesheets.
const stylesheet = 'apps/admin/src/studio-system.css';
const tree = postcss.parse(await readFile(stylesheet, 'utf8'), { from: stylesheet });
const findings = [];
const rules = new Map();
const conditions = new Set();
const imports = [];
const accessibilityRules = new Map([
  ['#root .admin-dashboard [hidden]', new Set(['display'])],
  ['#root .admin-dashboard *', new Set(['transition', 'scroll-behavior'])],
]);
tree.walkAtRules(rule => {
  if (rule.name === 'import') imports.push(rule.params);
  if (rule.name === 'media') {
    const condition = rule.params.replace(/\s+/g, '');
    if (conditions.has(condition)) findings.push(`Repeated responsive section: ${rule.params}`);
    conditions.add(condition);
  }
});
assert.deepEqual(imports, ['"../../web/src/styles/theme.css"'], 'Studio imports only shared design tokens');
tree.walkRules(rule => {
  const context = [];
  for (let parent = rule.parent; parent.type !== 'root'; parent = parent.parent) context.unshift(`${parent.name} ${parent.params}`);
  for (const selector of postcss.list.comma(rule.selector)) {
    const key = `${context.join('|')}|${selector}`;
    if (rules.has(key)) findings.push(`Repeated selector: ${selector} (${context.join(', ') || 'base'})`);
    rules.set(key, rule.source.start.line);
  }
  const properties = new Set();
  rule.walkDecls(declaration => {
    if (properties.has(declaration.prop)) findings.push(`Repeated property: ${rule.selector} / ${declaration.prop}`);
    properties.add(declaration.prop);
    if (declaration.prop.startsWith('--')) findings.push(`Component-local token: ${declaration.prop}`);
    if (declaration.important && !(accessibilityRules.get(rule.selector)?.has(declaration.prop)
      && (declaration.prop === 'display' || context.includes('media (prefers-reduced-motion: reduce)')))) {
      findings.push(`Styling !important: ${rule.selector} / ${declaration.prop}`);
    }
  });
});
// Detect a component placed into two competing shared layout groups, even
// when the groups spell their selector lists differently.
const layouts = new Map();
const layoutProperties = new Set(['display', 'grid-template-columns', 'gap', 'align-items', 'align-content', 'flex-wrap', 'padding', 'border-radius']);
for (const rule of tree.nodes) {
  if (rule.type !== 'rule') continue;
  const group = rule.selector.match(/^#root \.admin-dashboard :(?:where|is)\(([^()]+)\)$/);
  const selectors = group ? postcss.list.comma(group[1]).map(selector => `#root .admin-dashboard ${selector}`) : postcss.list.comma(rule.selector);
  for (const selector of selectors) {
    if (!/^#root \.admin-dashboard \.[a-z-]+$/.test(selector)) continue;
    for (const declaration of rule.nodes) {
      if (!layoutProperties.has(declaration.prop)) continue;
      const key = `${selector}|${declaration.prop}`;
      if (layouts.has(key)) findings.push(`Competing component layout: ${selector} / ${declaration.prop}`);
      layouts.set(key, declaration.value);
    }
  }
}

async function sources(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sources(file));
    else if (/\.[jt]sx?$/.test(entry.name)) files.push(file);
  }
  return files;
}
// These token-only layers were introduced after the original single-file
// consolidation. Keep the import boundary explicit rather than treating every
// historical admin stylesheet as part of the active design system.
const semanticStylesheets = new Set([
  './studio-system.css',
  './natal-reader-preview.css',
  './sky-variable-key.css',
  './studio-typography.css',
  './studio-component-consistency.css',
]);
for (const name of semanticStylesheets) {
  if (name === './studio-system.css') continue;
  const file = path.join('apps/admin/src', name);
  const moduleTree = postcss.parse(await readFile(file, 'utf8'), {from: file});
  moduleTree.walkAtRules('import', () => findings.push(`Nested Studio stylesheet import: ${file}`));
  moduleTree.walkDecls(declaration => {
    if (declaration.prop.startsWith('--')) findings.push(`Component-local token: ${file} / ${declaration.prop}`);
    if (declaration.important) findings.push(`Styling !important: ${file} / ${declaration.prop}`);
  });
}
for (const file of await sources('apps/admin/src')) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/(?:import\s*(?:\(\s*)?|from\s*)["']([^"']+\.css)["']/g)) {
    if (!semanticStylesheets.has(match[1])) findings.push(`Noncanonical Studio stylesheet: ${file} → ${match[1]}`);
  }
  if (/\bstyle\s*=/.test(source)) findings.push(`Inline style bypass: ${file}`);
}
for (const file of ['apps/admin/src/main.tsx', 'apps/web/src/main.tsx']) {
  const source = await readFile(file, 'utf8');
  assert.match(source, /studio-system\.css/, `${file} loads the canonical system`);
  assert.doesNotMatch(source, /["'][^"']*\/admin[^/"']*\.css["']/, `${file} must not load legacy admin styles`);
}
assert.deepEqual(findings, [], findings.join('\n'));
console.log(`Studio CSS architecture passed: ${rules.size} selectors; no duplicate rules/properties, unregistered imports, inline styles, local tokens, or styling !important. Accessibility exceptions: hidden and reduced motion.`);
