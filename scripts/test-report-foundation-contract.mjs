#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [
  modeMigration,
  envelopeMigration,
  apiSubjectTypes,
  webSubjectTypes,
  providerConfig,
  contentGeneration,
  generatedContent,
  styles,
  reportRoute,
  reportFixtureEntry,
  reportArticle,
  keyDatesPanel,
  articlePanelStyles
] = await Promise.all([
  read("apps/web/supabase/migrations/20260808120000_report_mode_year_ahead_surface.sql"),
  read("apps/web/supabase/migrations/20260808121000_user_reports.sql"),
  read("api/generate-user-content.ts"),
  read("apps/web/src/services/userGeneratedContent.ts"),
  read("api/_lib/provider-config.ts"),
  read("api/_lib/content-generation.ts"),
  read("apps/web/src/services/generatedContent.ts"),
  read("apps/web/src/styles.css"),
  read("apps/web/src/routes/ReportRoute.tsx"),
  read("apps/web/src/components/reports/ReportArticleFixtureEntry.tsx"),
  read("apps/web/src/components/reports/ReportArticle.tsx"),
  read("apps/web/src/components/KeyDatesPanel.tsx"),
  read("apps/web/src/styles/article-panels.css")
]);

for (const table of ["generated_interpretations", "user_generated_interpretations"]) {
  assert.match(modeMigration, new RegExp(`alter table public\\.${table}`, "u"));
}
assert.equal((modeMigration.match(/'report'/gu) ?? []).length, 2);
assert.equal((modeMigration.match(/'year_ahead'/gu) ?? []).length, 2);

for (const value of ["year_ahead", "relationship", "saturn_return"]) {
  assert.match(envelopeMigration, new RegExp(`'${value}'`, "u"));
}
for (const value of ["draft", "needs_review", "approved", "live"]) {
  assert.match(envelopeMigration, new RegExp(`'${value}'`, "u"));
}
assert.match(envelopeMigration, /nulls not distinct/iu);
assert.match(envelopeMigration, /for select/iu);
assert.doesNotMatch(envelopeMigration, /for\s+(?:insert|update|delete)/iu);

const reportSubjectTypes = [
  "year_ahead",
  "year_ahead_season",
  "year_ahead_key_date",
  "year_ahead_sr_moment",
  "year_ahead_sr_stance",
  "year_ahead_sr_sun",
  "year_ahead_headline",
  "year_ahead_saturn_return_callout",
  "relationship_report_section",
  "saturn_return",
  "saturn_return_section",
  "report_unit"
];
for (const subjectType of reportSubjectTypes) {
  assert.match(apiSubjectTypes, new RegExp(`\\| "${subjectType}"`, "u"));
  assert.match(webSubjectTypes, new RegExp(`\\| "${subjectType}"`, "u"));
}

assert.match(
  providerConfig,
  /relationship_report_section:\s*"CONTENT_GENERATION_PROVIDER_RELATIONSHIP"/u
);
assert.match(apiSubjectTypes, /provider: contentProvider\(input\.subjectType\)/u);
for (const subjectType of reportSubjectTypes.filter((value) => value !== "relationship_report_section")) {
  assert.doesNotMatch(providerConfig, new RegExp(`${subjectType}:`, "u"));
}
assert.match(contentGeneration, /type ContentMode = "feed" \| "in_depth" \| "article" \| "report";/u);
assert.match(contentGeneration, /type Surface = .*\| "year_ahead";/u);
assert.match(generatedContent, /GeneratedContentMode = "feed" \| "in_depth" \| "article" \| "report";/u);
assert.doesNotMatch(styles, /\.\/styles\/report-article\.css/u);
assert.doesNotMatch(styles, /article-panels\.css/u);
for (const entry of ["ReportDeliveryView", "ReportVanityDeliveryView"]) {
  assert.match(reportRoute, new RegExp(`const ${entry} = lazy\\(\\(\\) =>\\s*import\\("\\.\\./components/reports/${entry}"\\)`, "u"),
    `${entry} must remain deferred behind the report route.`);
}
assert.match(reportFixtureEntry, /import \{ ReportArticleFixtureHarness \} from "\.\/ReportArticleFixtureHarness";/u);
for (const entry of ["ReportDeliveryView", "ReportVanityDeliveryView", "ReportArticleFixtureHarness"]) {
  const consumer = await read(`apps/web/src/components/reports/${entry}.tsx`);
  assert.match(consumer, /import \{ ReportArticle\b[^}]*\} from "\.\/ReportArticle";/u,
    `${entry} must retain the shared renderer and its deferred stylesheet dependency.`);
}
assert.match(reportArticle, /import \{ KeyDatesPanel \} from "\.\.\/KeyDatesPanel";/u);
assert.match(keyDatesPanel, /import "\.\.\/styles\/article-panels\.css";/u);
assert.match(articlePanelStyles, /@import url\("\.\/report-article\.css"\);/u);

console.log("report foundation migration, subject-type, provider, runtime-type, and style contracts passed");
