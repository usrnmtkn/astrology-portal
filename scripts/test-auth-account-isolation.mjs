import assert from "node:assert/strict";
import { build } from "esbuild";

const fixture = { user: { id: "owner-a" }, calls: [], listener: null, rpc: null, verify: null };
globalThis.authIsolationFixture = fixture;
const result = await build({
  stdin: { contents: `export * from './apps/web/src/services/socialFriends.ts';
    export * from './apps/web/src/services/readerAuthReturn.ts';
    export * from './apps/web/src/services/authCallback.ts';
    export * from './apps/web/src/services/verifiedAccountObserver.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{ name: "auth-transport", setup(b) {
    b.onResolve({ filter: /\/auth$/ }, () => ({ path: "auth", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `
      const f = globalThis.authIsolationFixture;
      export const getSupabaseClient = async () => ({
        auth: {getSession: async () => ({data:{session:{user:f.user,access_token:'fixture-token'}},error:null})},
        rpc: (name, args) => {
          f.calls.push({name,args});
          const response = f.rpc(name,args);
          response.setHeader = (name,value) => { f.header={name,value}; return response; };
          return response;
        }});
      export const getVerifiedAuthUser = async () => f.user;
      export const getAuthAccount = async () => f.verify ? f.verify() : f.user;
      export const isAuthSessionStorageKey = () => true;
      export const onAuthClientRequested = () => () => {};
      export const onAuthAccountChange = callback => { f.listener = callback; return () => { f.listener = null; }; };
    ` }));
  } }]
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const storage = () => {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) };
};
globalThis.window = Object.assign(new EventTarget(), {
  sessionStorage: storage(), localStorage: storage(),
  location: { href: "https://app.example.test/", origin: "https://app.example.test",
    get pathname() { return new URL(this.href, this.origin).pathname; },
    get search() { return new URL(this.href, this.origin).search; },
    replace: path => { window.location.href = path; } }
});
globalThis.document = Object.assign(new EventTarget(), { visibilityState: "visible" });
const key = "tldrastro.pending-social-invitation";
const row = { invitation_id: "invite-a", contact_kind: "link", inviter_user_id: "inviter", inviter_display_name: "Fixture inviter", inviter_handle: "fixture", expires_at: "2026-12-01" };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));

try {
  // Preview and mutation must use the same token and principal, even when
  // storage/auth changes during an awaited request.
  window.sessionStorage.setItem(key, "token-a");
  fixture.rpc = async () => ({ data: [row], error: null });
  const preview = await api.previewPendingSocialInvitation("owner-a");
  assert.equal(preview.accountId, "owner-a");
  assert.equal(preview.token, "token-a");
  const before = fixture.calls.length;
  window.sessionStorage.setItem(key, "token-b");
  await assert.rejects(api.claimPendingSocialInvitation(preview), /changed/);
  window.sessionStorage.setItem(key, "token-a");
  fixture.user = { id: "owner-b" };
  await assert.rejects(api.claimPendingSocialInvitation(preview), /changed/);
  await assert.rejects(api.declinePendingSocialInvitation(preview), /changed/);
  await assert.rejects(api.syncOwnSocialProfile({displayName:"Fixture A",natalChart:null,birthTimeKnown:false}, "owner-a"), /signed-in|Sign in/);
  await assert.rejects(api.saveSocialHandle({handle:"fixture_a",displayName:"Fixture A"}, "owner-a"), /signed-in|Sign in/);
  assert.equal(fixture.calls.length, before, "Stale actions never reach the RPC");
  fixture.user = { id: "owner-a" };
  const pendingPreview = deferred();
  fixture.rpc = () => pendingPreview.promise;
  const oldPreview = api.previewPendingSocialInvitation("owner-a");
  await tick();
  window.sessionStorage.setItem(key, "token-b");
  pendingPreview.resolve({ data: [row], error: null });
  assert.equal(await oldPreview, null);
  window.sessionStorage.setItem(key, "token-a");
  const claim = deferred();
  fixture.rpc = () => claim.promise;
  const accepted = api.claimPendingSocialInvitation(preview);
  await tick();
  window.sessionStorage.setItem(key, "token-b");
  claim.resolve({ data: [{ invitation_id: "invite-a", request_status: "friends" }], error: null });
  await accepted;
  assert.equal(window.sessionStorage.getItem(key), "token-b", "Completing A cannot erase the next invitation");
  assert.equal(fixture.calls.at(-1).args.invitation_token_input, "token-a");

  for (const value of ["https://evil.test/", "//evil.test/", "/\\evil.test/", "/admin/content", "/?code=secret#account", "/#access_token=secret", "/reports/a#s=secret", "/reports/../admin"]) {
    assert.equal(api.validReaderReturnPath(value), null, value);
  }
  for (const path of ["/#account?view=journal", "/#friends?tab=circle", "/#calendar", "/#you", "/reports/fixture-reading"]) {
    window.location.href = `https://app.example.test/?readerReturn=${encodeURIComponent(path)}`;
    assert.equal(api.rememberReaderReturnPath(), path);
    window.location.href = "https://app.example.test/#access_token=fixture";
    assert.equal(api.returnToReaderAfterSignIn(), path.startsWith("/reports/"), "Hash navigation continues account loading; a different document restarts it");
    assert.equal(window.location.href, path);
    window.location.href = "https://app.example.test/";
    assert.equal(api.rememberReaderReturnPath(), null, "Return is consumed once");
  }
  for (const path of ["/#friends?tab=requests", "/#friends?chart=fixture&tab=requests"]) {
    window.location.href = `https://app.example.test/?readerReturn=${encodeURIComponent(path)}`;
    assert.equal(api.rememberReaderReturnPath(), "/#you");
    window.location.href = "https://app.example.test/";
    assert.equal(api.returnToReaderAfterSignIn(), false);
    assert.equal(window.location.href, "/#you", "Sign-in never resumes the Requests tab");
  }
  window.sessionStorage.setItem("tldrastro:readerAuthReturn", JSON.stringify({path:"/#friends?tab=requests", at: Date.now()}));
  window.location.href = "https://app.example.test/";
  assert.equal(api.returnToReaderAfterSignIn(), false);
  assert.equal(window.location.href, "/#you", "Previously stored Requests returns are normalized too");
  window.sessionStorage.setItem("tldrastro:readerAuthReturn", JSON.stringify({path:"/#friends?tab=circle", at: Date.now()}));
  window.location.href = "https://app.example.test/#sky";
  assert.equal(api.rememberReaderReturnPath(true), null);
  assert.equal(window.sessionStorage.getItem("tldrastro:readerAuthReturn"), null, "A new login clears stale return state");
  window.location.href = "https://app.example.test/#you";
  window.sessionStorage.setItem("tldrastro:readerAuthReturn", JSON.stringify({path:"/#you", at: Date.now()}));
  assert.equal(api.returnToReaderAfterSignIn(), false, "An already-reached return page cannot interrupt account loading");
  assert.equal(window.location.href, "https://app.example.test/#you");
  window.sessionStorage.setItem("tldrastro:readerAuthReturn", JSON.stringify({path:"/#account", at: Date.now() - 25*3600*1000}));
  assert.equal(api.rememberReaderReturnPath(), null);

  const assets = deferred();
  window.__tldrastroRecoverPageAssets = () => assets.promise;
  window.location.href = "https://app.example.test/?readerReturn=%2F%23friends%3Ftab%3Dcircle";
  assert.equal(api.returnToReaderAfterSignIn(), true, "Asset recovery owns the pending navigation");
  assert.match(window.location.href, /readerReturn=/, "Do not navigate before the failed asset cache is refreshed");
  assets.resolve();
  await tick();
  assert.equal(window.location.href, "/#friends?tab=circle", "Recovery retains the requested feature");
  const staleAssets = deferred();
  window.__tldrastroRecoverPageAssets = () => staleAssets.promise;
  window.location.href = "https://app.example.test/?readerReturn=%2F%23friends%3Ftab%3Dcircle";
  assert.equal(api.returnToReaderAfterSignIn(), true);
  window.location.href = "https://app.example.test/#sky";
  staleAssets.resolve();
  await tick();
  assert.equal(window.location.href, "https://app.example.test/#sky", "A later navigation supersedes pending auth recovery");
  const cancelledAssets = deferred();
  let cancelled = false;
  window.__tldrastroRecoverPageAssets = () => cancelledAssets.promise;
  window.location.href = "https://app.example.test/?readerReturn=%2F%23friends%3Ftab%3Dcircle";
  assert.equal(api.returnToReaderAfterSignIn(() => cancelled), true);
  cancelled = true;
  cancelledAssets.resolve();
  await tick();
  assert.match(window.location.href, /readerReturn=/, "A superseded account must not navigate when asset recovery finishes");
  delete window.__tldrastroRecoverPageAssets;

  const states = [];
  const stop = api.observeVerifiedAccount(state => states.push(state));
  await tick();
  assert.equal(states.at(-1).id, "owner-a");
  const delayed = deferred();
  fixture.verify = () => delayed.promise;
  window.dispatchEvent(new Event("focus"));
  fixture.listener(null, "SIGNED_OUT");
  assert.deepEqual(states.at(-1), { id: null, checked: true, error: false });
  delayed.resolve({ id: "owner-a" });
  await tick();
  assert.equal(states.at(-1).id, null, "Late verification cannot restore the signed-out account");
  fixture.verify = null;
  fixture.user = { id: "owner-b" };
  fixture.listener(fixture.user, "SIGNED_IN");
  assert.equal(states.at(-1).id, null, "Account switch first clears protected data");
  await tick();
  assert.equal(states.at(-1).id, "owner-b");
  stop();
  console.log("Auth isolation: invitation token/account binding, stale responses, bounded safe returns, and sign-out/account-switch verification passed.");
} finally {
  delete globalThis.window; delete globalThis.document; delete globalThis.authIsolationFixture;
}

const guardBuild = await build({ entryPoints: ['tests/helpers/synthetic-network-guard.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { installSyntheticNetworkGuard } = await import(`data:text/javascript;base64,${Buffer.from(guardBuild.outputFiles[0].text).toString('base64')}`);
let routeHandler;
const network = await installSyntheticNetworkGuard({
  routeWebSocket: async () => {},
  route: async (_pattern, handler) => { routeHandler = handler; }
}, 'http://127.0.0.1:4436');
const stylesheet = deferred(), fulfillment = deferred(), font = deferred();
const requests = [];
function fontRoute(url, resourceType, response, fulfill) {
  return {
    request: () => ({ url: () => url, method: () => 'GET', resourceType: () => resourceType,
      headers: () => ({ accept: '*/*', 'user-agent': 'Synthetic browser', cookie: 'must-not-forward', authorization: 'must-not-forward', referer: 'must-not-forward' }) }),
    fetch: async options => { requests.push(options); return response; }, fulfill
  };
}
let lateTransfer;
const firstTransfer = routeHandler(fontRoute('https://fonts.googleapis.com/css2?family=Fixture', 'stylesheet', stylesheet.promise, async () => {
  lateTransfer = routeHandler(fontRoute('https://fonts.gstatic.com/s/atkinsonhyperlegible/v1/fixture.woff2', 'font', font.promise, async () => {}));
  await fulfillment.promise;
}));
let drained = false;
const drain = network.finishStaticFonts().then(() => { drained = true; });
await tick();
assert.equal(drained, false, 'Teardown waits for the already-started stylesheet request');
stylesheet.resolve({});
await tick();
assert.equal(drained, false, 'Receiving a response does not finish its route fulfillment');
fulfillment.resolve();
await tick();
assert.equal(drained, false, 'A font request started by the stylesheet must finish too');
let blocked = false;
await routeHandler({ request: () => ({ url: () => 'https://external.example.test/private', method: () => 'POST', resourceType: () => 'fetch' }), abort: async () => { blocked = true; } });
assert.equal(blocked, true, 'Containment stays installed during teardown');
font.resolve({});
await Promise.all([firstTransfer, lateTransfer, drain]);
assert.equal(drained, true);
assert.equal(network.staticFontRequests.length, 2);
for (const options of requests) assert.deepEqual(options, { headers: { accept: '*/*', 'user-agent': 'Synthetic browser' }, maxRedirects: 0 });
const failure = new Error('Synthetic font transport failed');
const failedRoute = fontRoute('https://fonts.googleapis.com/css2?family=Fixture', 'stylesheet', null, async () => {});
failedRoute.fetch = async () => { throw failure; };
await assert.rejects(routeHandler(failedRoute), error => error === failure);
await assert.rejects(network.finishStaticFonts(), error => error === failure);
console.log('Synthetic font teardown: complete transfers, nested requests, containment and error propagation passed.');
