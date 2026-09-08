import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { usePageTransition } from "../apps/web/src/hooks/usePageTransition.ts";

function setup({ reduced = false, supported = true } = {}) {
  const snapshots = [];
  const dataset = {};
  globalThis.window = { matchMedia: () => ({ matches: reduced }) };
  globalThis.document = {
    documentElement: { dataset },
    startViewTransition: supported ? (update) => {
      let finish;
      const transition = {
        update,
        skipped: false,
        ready: Promise.resolve(),
        finished: new Promise(resolve => { finish = resolve; }),
        skipTransition() { this.skipped = true; },
        finish: () => finish()
      };
      snapshots.push(transition);
      return transition;
    } : undefined
  };
  let navigate;
  function Harness() {
    navigate = usePageTransition();
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  return { navigate, snapshots, dataset };
}

for (const options of [{ reduced: true }, { supported: false }]) {
  const { navigate, snapshots, dataset } = setup(options);
  let page = "Sky";
  navigate(() => { page = "You"; });
  assert.equal(page, "You", "fallback navigation must be immediate");
  assert.equal(snapshots.length, 0);
  assert.equal(dataset.pageTransition, undefined);
}

{
  const { navigate, snapshots, dataset } = setup();
  let page = "Sky";
  navigate(() => { page = "You"; });
  assert.equal(page, "Sky", "keep old page available for the snapshot");
  snapshots[0].update();
  assert.equal(page, "You");
  assert.equal(dataset.pageTransition, "active");
  snapshots[0].finish();
  await Promise.resolve();
  assert.equal(dataset.pageTransition, undefined);
}

{
  const { navigate, snapshots, dataset } = setup();
  const history = [];
  navigate(() => history.push("You"));
  navigate(() => history.push("Friends"));
  assert.equal(snapshots[0].skipped, true);
  snapshots[0].update();
  snapshots[0].finish();
  await Promise.resolve();
  assert.equal(dataset.pageTransition, "active", "old cleanup must not cancel new motion");
  snapshots[1].update();
  assert.deepEqual(history, ["Friends"], "a stale snapshot must not navigate or push history");
  snapshots[1].finish();
  await Promise.resolve();
  assert.equal(dataset.pageTransition, undefined);
}

{
  const { navigate, snapshots } = setup();
  let page = "Sky";
  navigate(() => { page = "You"; });
  navigate(() => { page = "Sky"; }, false);
  snapshots[0].update();
  assert.equal(page, "Sky", "Back or sign-out must supersede a pending navigation");
  assert.equal(snapshots[0].skipped, true);
}

delete globalThis.window;
delete globalThis.document;
console.log("Page transitions: snapshot timing, rapid navigation, history cancellation, reduced motion and unsupported-browser fallback passed.");
