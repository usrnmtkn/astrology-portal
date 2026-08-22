#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  renderCmsTemplatePreview,
  validateCmsTemplate
} from "../apps/web/src/content/cmsTemplateValidation.ts";

const valid = validateCmsTemplate({
  allowedSlots: ["houseOrdinal", "sign"],
  body: "Your {{houseOrdinal}} house begins in {{sign}}."
});
assert.deepEqual(valid.errors, [], "A complete CMS template using declared slots should pass.");
assert.equal(
  renderCmsTemplatePreview("Your {{houseOrdinal}} house begins in {{sign}}.", valid.previewSlots, "body"),
  "Your 2nd house begins in Taurus.",
  "The Admin preview should render representative calculated facts."
);

const unknown = validateCmsTemplate({
  allowedSlots: ["sign"],
  body: "{{sign}} meets {{missingTopic}}."
});
assert.match(unknown.errors.join(" "), /Unavailable slot: \{\{missingTopic\}\}\./u);

const empty = validateCmsTemplate({ allowedSlots: [], body: "   " });
assert.match(empty.errors.join(" "), /Body copy is required/u);

const unclosed = validateCmsTemplate({
  allowedSlots: ["sign"],
  body: "{{#sign}}{{sign}}"
});
assert.match(unclosed.errors.join(" "), /missing its closing tag/u);

const mismatched = validateCmsTemplate({
  allowedSlots: ["sign", "planet"],
  body: "{{#sign}}{{sign}}{{\/planet}}"
});

const personalizedAspect = validateCmsTemplate({
  allowedSlots: ["transitPlanet", "transitHouseOrdinal", "aspectVerb", "natalPoint", "natalHouseOrdinal", "window"],
  headline: "{{transitPlanet}} {{aspectVerb}} your {{natalPoint}}",
  body: "{{transitPlanet}} in your {{transitHouseOrdinal}} house is {{aspectVerb}} your natal {{natalPoint}} in your {{natalHouseOrdinal}} house {{window}}."
});
assert.deepEqual(personalizedAspect.errors, []);
assert.equal(personalizedAspect.previewSlots.transitHouseOrdinal, "3rd");
assert.equal(personalizedAspect.previewSlots.natalHouseOrdinal, "6th");
assert.equal(personalizedAspect.previewSlots.aspectVerb, "trining");

assert.match(mismatched.errors.join(" "), /does not match its opening tag/u);

console.log("CMS template validation passed: valid slots preview, while empty, unknown, and broken templates fail closed.");
