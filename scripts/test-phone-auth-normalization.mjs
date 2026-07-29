import assert from "node:assert/strict";
import {
  formatPhoneNumberForDisplay,
  formatUsPhoneInput,
  isValidUsPhoneNumber,
  maskPhoneNumber,
  normalizeUsPhoneNumber,
  phoneNumberLastFour
} from "../apps/web/src/services/phoneAuth.ts";

assert.equal(formatUsPhoneInput("2125550100"), "(212) 555-0100");
assert.equal(formatUsPhoneInput("+1 212 555 0100"), "(212) 555-0100");
assert.equal(normalizeUsPhoneNumber("(212) 555-0100"), "+12125550100");
assert.equal(formatPhoneNumberForDisplay("+12125550100"), "+1 212 555 0100");
assert.equal(phoneNumberLastFour("+1 212 555 0100"), "0100");
assert.equal(maskPhoneNumber("+12125550100"), "••• ••• 0100");
assert.equal(isValidUsPhoneNumber("(212) 555-0100"), true);
assert.equal(isValidUsPhoneNumber("1111111111"), false);

assert.throws(
  () => normalizeUsPhoneNumber("1111111111"),
  /valid United States mobile number/
);
assert.throws(
  () => normalizeUsPhoneNumber("+61 412 345 678"),
  /valid United States mobile number/
);
assert.throws(
  () => normalizeUsPhoneNumber("(416) 555-0100"),
  /valid United States mobile number/
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "phone auth normalization",
  contract: "US phone input formats as typed, validates against numbering metadata, and emits E.164."
}, null, 2));
