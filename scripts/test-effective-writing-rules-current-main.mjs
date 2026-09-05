import assert from "node:assert/strict";
import {
  EFFECTIVE_RULE_REGISTRY,
  effectiveRulesForSurface,
  renderEffectiveRulesForPrompt,
  tierForEnforcementId,
  validateEffectiveRuleRegistry
} from "../src/astro-writing/effectiveRules.mjs";

assert.equal(validateEffectiveRuleRegistry(), EFFECTIVE_RULE_REGISTRY);
assert.ok(EFFECTIVE_RULE_REGISTRY.rules.length > 0, "Expected governed writing rules.");
assert.ok(effectiveRulesForSurface({ surface: "daily" }).length > 0, "Daily surface must resolve effective rules.");
assert.ok(effectiveRulesForSurface({ surface: "friends-transit" }).length > 0, "Friends transit surface must resolve effective rules.");
const prompt = renderEffectiveRulesForPrompt({ surface: "card" });
assert.match(prompt, /Effective TLDR Astro writing rules/u);
assert.match(prompt, /Only the owner can approve exact prose/u);
assert.notEqual(tierForEnforcementId("unknown-rule", { surface: "card" }), "retired");

console.log("Current-main effective writing-rule registry foundation passed.");
