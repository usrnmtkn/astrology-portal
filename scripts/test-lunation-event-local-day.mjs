#!/usr/bin/env node

import assert from "node:assert/strict";
import { lunationEventOccursOnLocalDate } from "../apps/web/src/services/lunationEventDay.ts";

const piscesLunarEclipse = "2025-09-07T18:08:54.999Z";

assert.equal(lunationEventOccursOnLocalDate({
  occursAt: piscesLunarEclipse,
  selectedDate: "2025-09-07",
  timeZone: "America/New_York"
}), true);

assert.equal(lunationEventOccursOnLocalDate({
  occursAt: "2025-09-08T02:08:54.999Z",
  selectedDate: "2025-09-07",
  timeZone: "America/Los_Angeles"
}), true, "The selected eclipse date follows the reader's timezone, not UTC.");

assert.equal(lunationEventOccursOnLocalDate({
  occursAt: "2025-09-08T02:08:54.999Z",
  selectedDate: "2025-09-07",
  timeZone: "UTC"
}), false);

assert.equal(lunationEventOccursOnLocalDate({
  occursAt: "not-a-date",
  selectedDate: "2025-09-07",
  timeZone: "America/New_York"
}), false);

console.log("Lunation local-day routing passed: exact events are matched to the selected date in the reader's timezone.");
