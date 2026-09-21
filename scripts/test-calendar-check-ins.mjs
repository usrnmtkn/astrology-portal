import assert from "node:assert/strict";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: "export { addCalendarCheckInLibraryItem, removeCalendarCheckInLibraryItem, CalendarCheckInAuthError, deleteAllCalendarCheckInData, exportCalendarCheckInBundle, isCalendarDateKey, listCalendarCheckIns, sanitizeCheckInEntry, sanitizeLibraryLabel, upsertCalendarCheckIn } from './apps/web/src/services/calendarCheckIns.ts'; export { loadCalendarCheckInPeople } from './apps/web/src/features/calendar/calendarCheckInPeople.ts';",
    resolveDir: process.cwd()
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  plugins: [{
    name: "auth-transport",
    setup(buildApi) {
      buildApi.onResolve({ filter: /\/auth$/ }, () => ({ path: "auth", namespace: "test" }));
      buildApi.onResolve({ filter: /\/manualCharts$/ }, () => ({ path: "charts", namespace: "people-test" }));
      buildApi.onResolve({ filter: /\/socialFriends$/ }, () => ({ path: "friends", namespace: "people-test" }));
      buildApi.onLoad({ filter: /.*/, namespace: "people-test" }, ({ path }) => ({
        contents: path === "charts"
          ? "export const listManualCharts = async id => globalThis.calendarCheckInFixture.loadCharts(id);"
          : "export const listSocialFriends = async () => globalThis.calendarCheckInFixture.loadFriends();"
      }));
      buildApi.onLoad({ filter: /.*/, namespace: "test" }, () => ({
        contents: `
          export const getSupabaseClient = async () => globalThis.calendarCheckInFixture.client;
          export const getVerifiedAuthUser = async () => globalThis.calendarCheckInFixture.user;
        `
      }));
    }
  }]
});

const {
  addCalendarCheckInLibraryItem,
  removeCalendarCheckInLibraryItem,
  loadCalendarCheckInPeople,
  CalendarCheckInAuthError,
  deleteAllCalendarCheckInData,
  exportCalendarCheckInBundle,
  isCalendarDateKey,
  listCalendarCheckIns,
  sanitizeCheckInEntry,
  sanitizeLibraryLabel,
  upsertCalendarCheckIn
} = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

const sanitized = sanitizeCheckInEntry({
  mood: 9,
  sleep: -4,
  social: 140,
  moodNote: `${"a".repeat(4001)}keep`,
  note: `${"b".repeat(8001)}keep`,
  tags: [" Rest Day ", "", "x".repeat(81), "Rest Day", 12],
  people: ["Sam", "Sam", "   "],
  user_id: "victim-id"
});

assert.equal(sanitized.mood, 4);
assert.equal(sanitized.sleep, 0);
assert.equal(sanitized.social, 100);
assert.equal(sanitized.moodNote.length, 4000);
assert.equal(sanitized.note.length, 8000);
assert.deepEqual(sanitized.tags, ["Rest Day", `${"x".repeat(80)}`]);
assert.deepEqual(sanitized.people, ["Sam"]);
assert.equal("user_id" in sanitized, false);
assert.equal(sanitizeLibraryLabel("  "), null);
assert.equal(isCalendarDateKey("2026-09-20"), true);
assert.equal(isCalendarDateKey("09/20/2026"), false);

function createClient(store) {
  const query = (table) => {
    const operation = {
      select() { return operation; },
      eq(column, value) {
        store.filters.push({ table, column, value });
        return operation;
      },
      order() { return operation; },
      range() {
        return Promise.resolve({ data: store.rows[table] ?? [], error: null });
      },
      upsert(payload) {
        store.upserts.push({ table, payload });
        store.lastPayload = payload;
        return operation;
      },
      delete() {
        store.deletes.push({ table });
        return operation;
      },
      single() {
        return Promise.resolve({ data: store.lastPayload, error: null });
      },
      then(onFulfilled, onRejected) {
        return Promise.resolve({ data: store.rows[table] ?? [], error: null }).then(onFulfilled, onRejected);
      }
    };
    return operation;
  };

  return {
    from(table) {
      store.fromCalls.push(table);
      return query(table);
    }
  };
}

const unsignedStore = { fromCalls: [], filters: [], upserts: [], deletes: [], rows: {} };
globalThis.calendarCheckInFixture = {
  user: null,
  client: createClient(unsignedStore)
};

await assert.rejects(listCalendarCheckIns(), CalendarCheckInAuthError);
await assert.rejects(removeCalendarCheckInLibraryItem("tag", "Private"), CalendarCheckInAuthError);
assert.deepEqual(await loadCalendarCheckInPeople(), { people: [], incomplete: false });
await assert.rejects(upsertCalendarCheckIn("2026-09-20", sanitized), CalendarCheckInAuthError);
await assert.rejects(exportCalendarCheckInBundle(), CalendarCheckInAuthError);
await assert.rejects(deleteAllCalendarCheckInData(), CalendarCheckInAuthError);
assert.equal(unsignedStore.fromCalls.length, 0);

const store = { fromCalls: [], filters: [], upserts: [], deletes: [], rows: { calendar_check_ins: [] } };
globalThis.calendarCheckInFixture.user = { id: "owner-a" };
globalThis.calendarCheckInFixture.client = createClient(store);

await assert.rejects(upsertCalendarCheckIn("20-09-2026", sanitized), /That day could not be saved/);
assert.equal(store.fromCalls.length, 0);

const saved = await upsertCalendarCheckIn("2026-09-20", {
  ...sanitized,
  user_id: "victim-id"
});
assert.equal(store.upserts.length, 1);
assert.equal(store.upserts[0].payload.user_id, "owner-a");
assert.equal(store.upserts[0].payload.date_key, "2026-09-20");
assert.equal(saved.mood, 4);
assert.equal("user_id" in saved, false);

store.rows.calendar_check_ins = [{
  user_id: "owner-a",
  date_key: "2026-09-20",
  mood: 2,
  sleep: 50,
  social: 50,
  mood_note: "",
  note: "kept",
  tags: [],
  people: []
}, {
  user_id: "victim-id",
  date_key: "2026-09-21",
  mood: 0,
  sleep: 50,
  social: 50,
  mood_note: "",
  note: "leaked",
  tags: [],
  people: []
}];

const listed = await listCalendarCheckIns();
assert.deepEqual(Object.keys(listed), ["2026-09-20"]);
assert.equal(listed["2026-09-20"].note, "kept");
assert.equal(store.filters.some((filter) => filter.column === "user_id" && filter.value === "owner-a"), true);

const libraryLabel = await addCalendarCheckInLibraryItem("tag", "  Beginnings  ");
assert.equal(libraryLabel, "Beginnings");
assert.equal(store.upserts.at(-1).payload.user_id, "owner-a");
assert.equal(store.upserts.at(-1).payload.kind, "tag");

store.rows.calendar_check_in_library = [
  { user_id: "owner-a", kind: "tag", label: "Rest Day" },
  { user_id: "victim-id", kind: "tag", label: "Leaked" }
];

const exported = await exportCalendarCheckInBundle();
assert.deepEqual(exported.checkIns.map((entry) => entry.dateKey), ["2026-09-20"]);
assert.equal(exported.checkIns[0].note, "kept");
assert.equal("user_id" in exported.checkIns[0], false);
assert.deepEqual(exported.tags, ["Rest Day"]);
assert.ok(!exported.tags.includes("Leaked"));

await deleteAllCalendarCheckInData();
assert.equal(store.deletes.some((item) => item.table === "calendar_check_ins"), true);
assert.equal(store.deletes.some((item) => item.table === "calendar_check_in_library"), true);
assert.equal(
  store.filters.filter((filter) => filter.table === "calendar_check_ins" && filter.column === "user_id" && filter.value === "owner-a").length >= 1,
  true
);
assert.equal(
  store.filters.filter((filter) => filter.table === "calendar_check_in_library" && filter.column === "user_id" && filter.value === "owner-a").length >= 1,
  true
);

console.log("Calendar check-in store keeps verified-user ownership, sanitizes payloads, and refuses unsigned writes.");

await removeCalendarCheckInLibraryItem("tag", "  Rest Day  ");
assert.deepEqual(store.filters.slice(-3), [
  { table: "calendar_check_in_library", column: "user_id", value: "owner-a" },
  { table: "calendar_check_in_library", column: "kind", value: "tag" },
  { table: "calendar_check_in_library", column: "label", value: "Rest Day" }
]);
globalThis.calendarCheckInFixture.loadCharts = async id => {
  assert.equal(id, "owner-a");
  return [{ id: "chart-a", ownerUserId: "owner-a", displayName: "Robin" }, { id: "chart-b", ownerUserId: "other-owner", displayName: "Must not appear" }];
};
globalThis.calendarCheckInFixture.loadFriends = async () => [{ userId: "friend-a", displayName: "Avery", handle: "avery_qa" }];
assert.deepEqual(await loadCalendarCheckInPeople(), {
  people: [{ id: "friend:friend-a", name: "Avery", kind: "Friend", handle: "avery_qa" }, { id: "chart:chart-a", name: "Robin", kind: "Chart" }],
  incomplete: false
});
globalThis.calendarCheckInFixture.loadFriends = async () => { throw new Error("Unavailable"); };
const partial = await loadCalendarCheckInPeople();
assert.equal(partial.incomplete, true);
assert.deepEqual(partial.people.map(person => person.name), ["Robin"]);
globalThis.calendarCheckInFixture.loadFriends = async () => {
  globalThis.calendarCheckInFixture.user = { id: "owner-b" };
  return [];
};
await assert.rejects(loadCalendarCheckInPeople(), /account changed/);
console.log("Calendar tag deletion is owner-scoped; people lookup includes owned charts and friends, handles partial failure, and discards account-switch results.");
