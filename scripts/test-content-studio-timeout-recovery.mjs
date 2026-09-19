#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const client = fs.readFileSync(new URL("../apps/admin/src/generatedContentClient.ts", import.meta.url), "utf8");
const status = fs.readFileSync(new URL("../apps/admin/src/ContentLiveStatus.tsx", import.meta.url), "utf8");

assert.match(client, /verifyTimedOutSave/u, "Timed-out saves must be verified before an error is shown.");
assert.match(client, /studioInventoryDocumentPath\(row\.content_key, \{ status: "DRAFT"/u, "Save verification must re-read the exact content key without issuing a second write.");
assert.match(client, /if \(!saveMayHaveCompleted\(error\)\) throw error/u, "Only ambiguous timeout/interruption failures may enter save verification.");
assert.match(client, /if \(verified\) return verified/u, "A late successful save must resolve as saved after verification.");
assert.doesNotMatch(client, /catch[\s\S]{0,300}method:\s*"PATCH"/u, "Timeout recovery must never retry the write itself.");

assert.match(status, /editorialStatusPresentation/u, "Successful not-live checks still present the saved editorial state.");
assert.match(status, /Reader serving status could not be verified\. Refresh to retry\./u);
assert.doesNotMatch(status, /Showing the saved editorial state/u, "A failed serving check must not look like Draft, Ready, or Live.");
assert.match(status, /if \(status === "unavailable"\)[\s\S]*?>Unavailable<\/StudioStatusBadge>/u, "Failed serving checks must stay Unavailable.");

console.log("Content Studio timeout recovery contract passed.");
