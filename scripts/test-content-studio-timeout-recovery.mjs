#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const client = fs.readFileSync(new URL("../apps/admin/src/generatedContentClient.ts", import.meta.url), "utf8");
const status = fs.readFileSync(new URL("../apps/admin/src/ContentLiveStatus.tsx", import.meta.url), "utf8");

assert.match(client, /verifyTimedOutSave/u, "Timed-out saves must be verified before an error is shown.");
assert.match(client, /contentKey=.*status=DRAFT/u, "Save verification must re-read the exact content key without issuing a second write.");
assert.match(client, /if \(!saveMayHaveCompleted\(error\)\) throw error/u, "Only ambiguous timeout/interruption failures may enter save verification.");
assert.match(client, /if \(verified\) return verified/u, "A late successful save must resolve as saved after verification.");
assert.doesNotMatch(client, /catch[\s\S]{0,300}method:\s*"PATCH"/u, "Timeout recovery must never retry the write itself.");

assert.match(status, /editorialStatusPresentation/u, "Live-status failures must have a saved editorial-state fallback.");
assert.match(status, /Reader serving status could not be verified\. Showing the saved editorial state\./u);
assert.match(status, /if \(editorial\)[\s\S]*editorial\.label/u, "Known Draft/Ready/etc. rows must not degrade to Unavailable when only the live check fails.");

console.log("Content Studio timeout recovery contract passed.");
