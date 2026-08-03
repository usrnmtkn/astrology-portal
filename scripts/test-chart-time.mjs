import assert from "node:assert/strict";
import {
  displayTimeToTwentyFourHour,
  twentyFourHourTimeToDisplay
} from "../apps/web/src/services/chartTime.ts";

assert.equal(twentyFourHourTimeToDisplay("00:00"), "12:00 AM");
assert.equal(twentyFourHourTimeToDisplay("09:05"), "9:05 AM");
assert.equal(twentyFourHourTimeToDisplay("12:00"), "12:00 PM");
assert.equal(twentyFourHourTimeToDisplay("23:59"), "11:59 PM");
assert.equal(twentyFourHourTimeToDisplay("not-a-time"), "12:00 PM");

assert.equal(displayTimeToTwentyFourHour(null), "12:00");
assert.equal(displayTimeToTwentyFourHour("12:00 AM"), "00:00");
assert.equal(displayTimeToTwentyFourHour("9:05 am"), "09:05");
assert.equal(displayTimeToTwentyFourHour("12:00 PM"), "12:00");
assert.equal(displayTimeToTwentyFourHour("11:59 PM"), "23:59");
assert.equal(displayTimeToTwentyFourHour("07:30"), "07:30");

console.log("Chart time tests passed.");
