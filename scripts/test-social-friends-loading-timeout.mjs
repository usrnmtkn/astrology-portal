import assert from "node:assert/strict";
import { withFriendsLoadingTimeout } from "../apps/web/src/features/friends/socialFriendsLoading.ts";

assert.deepEqual(await withFriendsLoadingTimeout(Promise.resolve(["friend"]), 100), ["friend"]);
const failure = new Error("offline");
await assert.rejects(withFriendsLoadingTimeout(Promise.reject(failure), 100), error => error === failure);
let finish;
const delayed = new Promise(resolve => { finish = resolve; });
let published = false;
const request = withFriendsLoadingTimeout(delayed, 5).then(() => { published = true; });
await assert.rejects(request, /timed out/);
finish(["late friend"]);
await Promise.resolve();
assert.equal(published, false, "A timed-out response must not publish stale data after retry.");
assert.deepEqual(await withFriendsLoadingTimeout(Promise.resolve(["retry"]), 100), ["retry"]);
console.log("Friends timeout, rejection, late-response isolation, and retry checks passed.");
