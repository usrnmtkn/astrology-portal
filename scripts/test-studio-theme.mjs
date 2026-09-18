import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  }
};

const {
  getStudioPalette,
  getStudioTheme,
  saveStudioPalette,
  saveStudioTheme,
  studioShellAttributes
} = await import(new URL("../apps/admin/src/studioTheme.ts", import.meta.url).href);

assert.equal(getStudioTheme(), "dark");
assert.equal(getStudioPalette(), "neutral");
assert.deepEqual(studioShellAttributes(), {
  "data-studio-theme": "dark",
  "data-theme": "dark",
  "data-studio-palette": "neutral"
});

saveStudioTheme("light");
saveStudioPalette("green");
assert.equal(localStorage.getItem("tldrastro:studio-theme"), "light");
assert.equal(localStorage.getItem("tldrastro:studio-palette"), "green");
assert.deepEqual(studioShellAttributes(), {
  "data-studio-theme": "light",
  "data-theme": "light",
  "data-studio-palette": "green"
});

console.log("Studio theme persistence passed: light/dark and green/black-and-white chrome persist independently.");
