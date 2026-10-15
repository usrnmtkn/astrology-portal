import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Exercise the actual loader and component declarations with real React. Only
// the module transport and article copy are synthetic; no serving data is used.
const app = readFileSync('apps/web/src/App.tsx', 'utf8');
const source = ts.createSourceFile('App.tsx', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['SkyDetailArticleModule', 'loadedSkyDetailArticle', 'loadSkyDetailArticle',
  'preloadSkyDetailArticle', 'LazySkyDetailArticle', 'SkyDetailArticle'];
const statements = source.statements.filter(statement => {
  if (ts.isVariableStatement(statement)) return statement.declarationList.declarations.some(declaration =>
    ts.isIdentifier(declaration.name) && names.includes(declaration.name.text));
  return (ts.isTypeAliasDeclaration(statement) || ts.isFunctionDeclaration(statement))
    && Boolean(statement.name && names.includes(statement.name.text));
});
for (const name of names) {
  const matches = statements.filter(statement => ts.isVariableStatement(statement)
    ? statement.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === name)
    : (ts.isTypeAliasDeclaration(statement) || ts.isFunctionDeclaration(statement)) && statement.name?.text === name);
  if (matches.length !== 1) throw new Error(`Expected one actual Sky detail declaration: ${name}`);
}
let imports = 0;
const transformed = ts.transform(source, [context => node => {
  const visit: ts.Visitor = child => {
    if (ts.isCallExpression(child) && child.expression.kind === ts.SyntaxKind.ImportKeyword) {
      if (child.arguments.length !== 1 || !ts.isStringLiteral(child.arguments[0])
        || child.arguments[0].text !== './features/sky/SkyDetailArticle') throw new Error('Unexpected Sky module transport.');
      imports++;
      return ts.factory.createCallExpression(ts.factory.createIdentifier('contractImport'), undefined, []);
    }
    return ts.visitEachChild(child, visit, context);
  };
  return ts.factory.updateSourceFile(node, statements.map(statement => ts.visitNode(statement, visit) as ts.Statement));
}]);
const declarations = ts.createPrinter().printFile(transformed.transformed[0]);
transformed.dispose();
if (imports !== 1) throw new Error('Expected exactly one actual Sky module transport.');
let bundle: string;

test.beforeAll(async () => {
  const result = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React, { Component, lazy, Suspense, useLayoutEffect, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      let resolveImport, rejectImport, instance = 0;
      const pending = new Promise((resolve, reject) => { resolveImport = resolve; rejectImport = reject; });
      const module = { SkyDetailArticle: SyntheticArticle };
      function contractImport() {
        if (localStorage.getItem('sky-module-contract') === 'undefined') return Promise.resolve(undefined);
        if (localStorage.getItem('sky-module-contract') === 'rejected') return Promise.reject(importError);
        return pending;
      }
      const importError = new Error('Synthetic module transport failure');
      ${declarations}
      function SyntheticArticle() {
        const [id] = useState(() => ++instance);
        const [count, setCount] = useState(0);
        return <article data-instance={id}>
          <h1>Synthetic complete article</h1>
          <p>Synthetic opening paragraph.</p><p>Synthetic closing paragraph.</p>
          <button onClick={() => setCount(n => n + 1)}>State {count}</button>
        </article>;
      }
      class Boundary extends Component {
        state = { failed: false };
        static getDerivedStateFromError() { return { failed: true }; }
        render() { return this.state.failed ? <p role="alert">Synthetic module unavailable</p> : this.props.children; }
      }
      window.contract = { fallbackCommits: 0, parentCommits: 0,
        resolve: () => resolveImport(module),
        load: loadSkyDetailArticle,
        verifyRejection: async () => {
          try { await loadSkyDetailArticle(); return false; }
          catch (error) { return error === importError; }
        }
      };
      function Fallback() {
        useLayoutEffect(() => { window.contract.fallbackCommits++; }, []);
        return <p role="status">Synthetic loading module</p>;
      }
      function Parent() {
        const [version, setVersion] = useState(0);
        window.contract.revalidate = () => setVersion(n => n + 1);
        useLayoutEffect(() => { window.contract.parentCommits++; });
        return <Boundary><Suspense fallback={<Fallback />}>
          <SkyDetailArticle detail={{ title: 'Synthetic complete article', body: ['Synthetic opening paragraph.', 'Synthetic closing paragraph.'], version }} onClose={() => {}} />
        </Suspense></Boundary>;
      }
      window.contract.render = () => createRoot(document.getElementById('root')).render(<Parent />);
    ` },
    bundle: true, format: 'esm', platform: 'browser', write: false,
    define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent'
  });
  bundle = result.outputFiles[0].text;
});

async function openContract(page: import('@playwright/test').Page, mode = '') {
  await page.addInitScript(mode => {
    if (sessionStorage.getItem('sky-module-contract-initialized')) return;
    sessionStorage.setItem('sky-module-contract-initialized', 'true');
    if (mode) localStorage.setItem('sky-module-contract', mode);
    else localStorage.removeItem('sky-module-contract');
  }, mode);
  await page.route('**/sky-module-contract', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><style>body{min-height:3000px}</style><div id="root"></div><script type="module" src="/sky-module-contract.js"></script>'
  }));
  await page.route('**/sky-module-contract.js', route => route.fulfill({ contentType: 'text/javascript', body: bundle }));
  await page.goto('/sky-module-contract');
  await page.waitForFunction(() => Boolean((window as any).contract));
}

for (const width of [390, 1440]) {
  test(`preloaded Sky module admits the complete article without another fallback ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await openContract(page);
    await page.evaluate(async () => {
      const contract = (window as any).contract;
      contract.resolve(); await contract.load(); contract.render();
    });
    await expect(page.locator('article')).toHaveText('Synthetic complete articleSynthetic opening paragraph.Synthetic closing paragraph.State 0');
    expect(await page.evaluate(() => (window as any).contract.fallbackCommits)).toBe(0);
    expect(errors).toEqual([]);
  });

  test(`late Sky module preserves the committed article through parent revalidation ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await openContract(page);
    await page.evaluate(() => (window as any).contract.render());
    await expect(page.getByRole('status')).toHaveText('Synthetic loading module');
    await expect(page.locator('article')).toHaveCount(0);
    await page.evaluate(() => (window as any).contract.resolve());
    await expect(page.locator('article')).toBeVisible();
    await page.getByRole('button', { name: 'State 0', exact: true }).click();
    await expect(page.getByRole('button', { name: 'State 1', exact: true })).toBeVisible();
    const before = await page.evaluate(() => {
      (window as any).articleNode = document.querySelector('article');
      window.scrollTo(0, 300);
      return { instance: document.querySelector('article')?.getAttribute('data-instance'), commits: (window as any).contract.parentCommits, text: document.querySelector('article')?.textContent };
    });
    await page.evaluate(() => (window as any).contract.revalidate());
    await expect.poll(() => page.evaluate(() => (window as any).contract.parentCommits)).toBeGreaterThan(before.commits);
    expect(await page.evaluate(() => document.querySelector('article') === (window as any).articleNode)).toBe(true);
    await expect(page.locator('article')).toHaveAttribute('data-instance', before.instance!);
    await expect(page.locator('article')).toHaveText(before.text!);
    expect(await page.evaluate(() => scrollY)).toBe(300);
    expect(errors).toEqual([]);
  });
}

test('handled Sky preload failure adds no export-access error and leaves recovery available', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openContract(page, 'undefined');
  expect(await page.evaluate(async () => await (window as any).contract.load() === undefined)).toBe(true);
  expect(errors).toEqual([]);
  await page.evaluate(() => (window as any).contract.render());
  await expect(page.getByRole('alert')).toHaveText('Synthetic module unavailable');
  await page.evaluate(() => localStorage.removeItem('sky-module-contract'));
  // A fresh document owns recovery, as it does for the existing reader boundary.
  await page.reload();
  await page.evaluate(async () => { const c = (window as any).contract; c.resolve(); await c.load(); c.render(); });
  await expect(page.locator('article')).toContainText('Synthetic closing paragraph.');
});

test('ordinary Sky module rejection retains its original error', async ({ page }) => {
  await openContract(page, 'rejected');
  expect(await page.evaluate(() => (window as any).contract.verifyRejection())).toBe(true);
});
