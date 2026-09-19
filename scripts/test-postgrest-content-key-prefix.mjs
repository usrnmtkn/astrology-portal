#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  postgrestContentKeyPrefixAnd,
  postgrestPrefixUpperBound
} from "../api/_lib/postgrest-content-key-prefix.ts";

assert.equal(postgrestPrefixUpperBound("education/astro-101/"), "education/astro-1010");
assert.equal(
  postgrestContentKeyPrefixAnd("education/astro-101/"),
  '(content_key.gte."education/astro-101/",content_key.lt."education/astro-1010")'
);

const astroKey = "education/astro-101/chapter/01-what-is-a-birth-chart";
assert.ok(astroKey >= "education/astro-101/");
assert.ok(astroKey < "education/astro-1010");

assert.equal(postgrestPrefixUpperBound("sky.placement."), "sky.placement/");
assert.ok("sky.placement.sun.aries" < "sky.placement/");

const inventory = fs.readFileSync("api/admin/generated-content-inventory.ts", "utf8");
assert.match(inventory, /postgrestContentKeyPrefixAnd/u);
assert.doesNotMatch(inventory, /like\."\$\{contentKeyPrefix\}/u);

console.log("PostgREST content-key prefix range contract passed.");
