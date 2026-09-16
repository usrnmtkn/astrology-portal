import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';

// Audit the shipped Studio system, not disconnected historical stylesheets.
const stylesheet = 'apps/admin/src/studio-system.css';
const themeStylesheet = 'apps/admin/src/admin-theme.css';
const tree = postcss.parse(await readFile(stylesheet, 'utf8'), { from: stylesheet });
const themeTree = postcss.parse(await readFile(themeStylesheet, 'utf8'), { from: themeStylesheet });
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
assert.deepEqual(imports, ['"./admin-theme.css"'], 'Studio imports only the canonical admin theme');
const themeImports = [];
themeTree.walkAtRules(rule => {
  if (rule.name === 'import') themeImports.push(rule.params);
});
assert.deepEqual(themeImports, [], 'The canonical admin theme owns Studio tokens and must not re-import the web theme');
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
for (const file of await sources('apps/admin/src')) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/(?:import\s*(?:\(\s*)?|from\s*)["']([^"']+\.css)["']/g)) {
    if (match[1] !== './studio-system.css') findings.push(`Noncanonical Studio stylesheet: ${file} → ${match[1]}`);
  }
  if (/\bstyle\s*=/.test(source)) findings.push(`Inline style bypass: ${file}`);
}
for (const file of ['apps/admin/src/main.tsx', 'apps/web/src/main.tsx']) {
  const source = await readFile(file, 'utf8');
  assert.match(source, /studio-system\.css/, `${file} loads the canonical system`);
  assert.doesNotMatch(source, /["'][^"']*\/admin[^/"']*\.css["']/, `${file} must not load legacy admin styles`);
}
assert.deepEqual(findings, [], findings.join('\n'));
console.log(`Studio CSS architecture passed: ${rules.size} selectors; canonical admin-theme ownership; no duplicate rules/properties, legacy imports, inline styles, local tokens, or styling !important. Accessibility exceptions: hidden and reduced motion.`);
