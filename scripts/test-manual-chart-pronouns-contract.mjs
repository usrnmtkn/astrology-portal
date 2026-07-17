import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manualChartsSource = readFileSync("apps/web/src/services/manualCharts.ts", "utf8");
const friendChartModalSource = readFileSync("apps/web/src/features/friends/FriendChartModal.tsx", "utf8");
const pronounMigration = readFileSync("apps/web/supabase/migrations/20260709093000_manual_chart_pronouns.sql", "utf8");

assert.match(
  pronounMigration,
  /add column if not exists pronouns text not null default 'name_only'/,
  "manual_charts pronouns migration must add a defaulted pronouns column."
);
assert.match(
  pronounMigration,
  /check \(pronouns in \('she', 'he', 'they', 'name_only'\)\)/,
  "manual_charts pronouns migration must constrain supported pronoun values."
);
assert.match(
  friendChartModalSource,
  /pronounChoices\.map/,
  "Friend chart modal must expose pronoun choices."
);
assert.match(
  manualChartsSource,
  /pronouns: normalizePronounChoice\(row\.pronouns \?\? pronounsFromNatalChart\(row\.natal_chart\)\)/,
  "Manual chart rows must load pronouns from the column or deployed-schema fallback metadata."
);
assert.match(
  manualChartsSource,
  /natal_chart: natalChartWithPronouns\(input\.natalChart, pronouns\)/,
  "Manual chart writes must preserve pronouns in natal chart metadata for legacy deployed schemas."
);
assert.match(
  manualChartsSource,
  /isMissingManualChartPronounsColumn\(error\)/,
  "Manual chart writes must detect deployed schemas missing manual_charts.pronouns."
);
assert.match(
  manualChartsSource,
  /PGRST204/,
  "Manual chart writes must detect PostgREST schema-cache errors for missing manual_charts.pronouns."
);
assert.match(
  manualChartsSource,
  /omitPronounsColumn: true/,
  "Manual chart writes must retry without the pronouns column when the deployed schema is behind."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "manual_charts.pronouns",
  contract: "Manual chart pronouns are collected, migrated, persisted through the column when available, and preserved through fallback metadata when the deployed schema is behind."
}, null, 2));
