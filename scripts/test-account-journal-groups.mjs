import assert from "node:assert/strict";
import {
  accountJournalItemsFromEntries,
  accountJournalMoodHighlights,
  formatAccountJournalDateLine,
  groupAccountJournalEntries,
  localCalendarDateKey
} from "../apps/web/src/features/account/accountJournalGroups.ts";

const entries = {
  "2026-09-20": {
    mood: 3,
    sleep: 60,
    social: 40,
    moodNote: "Sunday note",
    note: "",
    tags: ["Rest Day"],
    people: []
  },
  "2026-09-14": {
    mood: 2,
    sleep: 50,
    social: 50,
    moodNote: "",
    note: "Monday note",
    tags: [],
    people: ["Sam"]
  },
  "2026-08-03": {
    mood: 2,
    sleep: 40,
    social: 30,
    moodNote: "",
    note: "August",
    tags: [],
    people: []
  }
};

const items = accountJournalItemsFromEntries(entries);
assert.deepEqual(items.map((item) => item.dateKey), ["2026-09-20", "2026-09-14", "2026-08-03"]);
assert.equal(formatAccountJournalDateLine("2026-09-20"), "Sunday, September 20, 2026");

const days = groupAccountJournalEntries(items, "days");
assert.equal(days.length, 3);
assert.equal(days[0].key, "2026-09-20");
assert.match(days[0].label, /Sunday/);
assert.match(days[0].detail, /1 check-in/);

const weeks = groupAccountJournalEntries(items, "weeks");
assert.equal(weeks.length, 2);
assert.equal(weeks[0].items.length, 2);
assert.equal(weeks[0].key, "2026-09-14");
assert.match(weeks[0].label, /Week /);
assert.match(weeks[0].detail, /September 14/);
assert.match(weeks[0].detail, /20/);
assert.match(weeks[0].detail, /2 check-ins/);

const months = groupAccountJournalEntries(items, "months");
assert.equal(months.length, 2);
assert.equal(months[0].key, "2026-09");
assert.equal(months[0].label, "September 2026");
assert.equal(months[0].items.length, 2);
assert.equal(months[1].key, "2026-08");

const highlights = accountJournalMoodHighlights(items);
assert.deepEqual(highlights.map((share) => [share.label, share.count, share.percent]), [
  ["Okay", 2, 67],
  ["Good", 1, 33]
]);

assert.match(localCalendarDateKey(new Date("2026-09-20T15:00:00-04:00")), /^\d{4}-\d{2}-\d{2}$/);

console.log("Account journal grouping tests passed.");
