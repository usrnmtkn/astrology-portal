import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium, type Browser, type Page } from "@playwright/test";
import { buildSync } from "esbuild";

// Exercise the actual hook in React, with browser timers, rather than a model
// of its implementation. The fixture never mounts the application or fetches.
const fixture = buildSync({
  stdin: {
    contents: `
      import { StrictMode } from "react";
      import { createRoot } from "react-dom/client";
      import { flushSync } from "react-dom";
      import { useMinimumLoading } from "./apps/web/src/hooks/useMinimumLoading";
      let root;
      function Probe({ loading, minimum }) {
        const pending = useMinimumLoading(loading, minimum);
        return <output>{String(pending)}</output>;
      }
      window.probe = {
        render(loading, minimum = 280) {
          root ??= createRoot(document.getElementById("root"));
          flushSync(() => root.render(<StrictMode><Probe loading={loading} minimum={minimum} /></StrictMode>));
        },
        unmount() { flushSync(() => root.unmount()); root = null; }
      };
    `,
    resolveDir: process.cwd(), loader: "tsx"
  }, bundle: true, write: false, jsx: "automatic", format: "iife"
}).outputFiles[0].text;

let browser: Browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function withProbe(run: (page: Page, render: (loading: boolean, minimum?: number) => Promise<void>, pending: () => Promise<string>) => Promise<void>) {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: fixture });
    await run(page,
      (loading, minimum = 280) => page.evaluate(({ loading, minimum }) => (window as any).probe.render(loading, minimum), { loading, minimum }),
      () => page.locator("output").innerText());
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
}

test("ready on mount does not introduce a skeleton", () => withProbe(async (_, render, pending) => {
  await render(false);
  assert.equal(await pending(), "false");
}));

test("a fast response holds until 280ms, including StrictMode effect replay", () => withProbe(async (page, render, pending) => {
  await render(true);
  await page.clock.runFor(100);
  await render(false);
  await page.clock.runFor(179);
  assert.equal(await pending(), "true");
  await page.clock.runFor(1);
  assert.equal(await pending(), "false");
}));

test("a slow response resolves immediately once data arrives", () => withProbe(async (page, render, pending) => {
  await render(true);
  await page.clock.runFor(400);
  assert.equal(await pending(), "true");
  await render(false);
  assert.equal(await pending(), "false");
}));

test("a later load starts immediately; pending rerenders do not restart its deadline", () => withProbe(async (page, render, pending) => {
  await render(false);
  await render(true);
  assert.equal(await pending(), "true");
  await page.clock.runFor(150);
  await render(true);
  await render(false);
  await page.clock.runFor(130);
  assert.equal(await pending(), "false");
}));

test("restarting during a hold cancels the old release and gets a full new minimum", () => withProbe(async (page, render, pending) => {
  await render(true);
  await page.clock.runFor(100);
  await render(false);
  await page.clock.runFor(100);
  await render(true);
  await render(false);
  await page.clock.runFor(80);
  assert.equal(await pending(), "true");
  await page.clock.runFor(199);
  assert.equal(await pending(), "true");
  await page.clock.runFor(1);
  assert.equal(await pending(), "false");
}));

test("custom minimum and unmount cleanup do not affect a new ready mount", () => withProbe(async (page, render, pending) => {
  await render(true, 40);
  await render(false, 40);
  await page.clock.runFor(40);
  assert.equal(await pending(), "false");
  await render(true);
  await render(false);
  await page.evaluate(() => (window as any).probe.unmount());
  await render(false);
  await page.clock.runFor(500);
  assert.equal(await pending(), "false");
}));
