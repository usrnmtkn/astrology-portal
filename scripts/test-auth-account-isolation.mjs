import assert from "node:assert/strict";
import { build } from "esbuild";

const fixture = { user: { id: "owner-a" }, calls: [], listener: null, rpc: null, verify: null };
globalThis.authIsolationFixture = fixture;
const result = await build({
  stdin: { contents: `export * from './apps/web/src/services/socialFriends.ts';
    export * from './apps/web/src/services/readerAuthReturn.ts';
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
  location: { href: "https://app.example.test/", origin: "https://app.example.test", replace: path => { window.location.href = path; } }
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
  for (const path of ["/#account?view=journal", "/#friends?tab=circle", "/#you", "/reports/fixture-reading"]) {
    window.location.href = `https://app.example.test/?readerReturn=${encodeURIComponent(path)}`;
    assert.equal(api.rememberReaderReturnPath(), path);
    window.location.href = "https://app.example.test/#access_token=fixture";
    assert.equal(api.returnToReaderAfterSignIn(), true);
    assert.equal(window.location.href, path);
    window.location.href = "https://app.example.test/";
    assert.equal(api.rememberReaderReturnPath(), null, "Return is consumed once");
  }
  window.sessionStorage.setItem("tldrastro:readerAuthReturn", JSON.stringify({path:"/#account", at: Date.now() - 25*3600*1000}));
  assert.equal(api.rememberReaderReturnPath(), null);

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
