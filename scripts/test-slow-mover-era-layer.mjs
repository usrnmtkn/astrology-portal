#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vite = await createServer({
  root: path.join(repoRoot, "apps", "web"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent"
});

const placement = {
  contentKey: "fallback-hook/sky-sign-copy/saturn/capricorn",
  content_role: "fallback_hook",
  grammar_frame: "continuous_editorial_unit",
  render_policy: "sky-placement-continuous-v2",
  fact_line: "{{entryDate}} to {{exitDate}}",
  opening: "Opening.",
  tension: "Tension.",
  development: "Development.",
  era_layer: {
    frame: "Era frame.",
    handoff: "Saturn moved through {{priorSign}} from {{priorSignEntryDateWithYear}} to {{priorSignExitDateWithYear}}.",
    recurrence: "Saturn last moved through Capricorn from {{previousResidencyEntryDateWithYear}} to {{previousResidencyExitDateWithYear}}.",
    collective_lesson: "Collective lesson."
  },
  aspect_insert: "{{aspectInsert}}",
  close: "Close.",
  review_status: "approved",
  source_keys: ["test"]
};
const education = {
  contentKey: "fallback-hook/sky-planet-education/saturn",
  content_role: "fallback_hook",
  grammar_frame: "collective_editorial_unit",
  render_policy: "sky-placement-planet-education-v1",
  body: "Saturn education.",
  review_status: "approved",
  source_keys: ["test"]
};
const facts = {
  planet: "saturn",
  sign: "capricorn",
  entryDate: "January 24, 2047",
  exitDate: "January 21, 2050",
  priorSign: "sagittarius",
  priorSignEntryDate: "October 31, 2044",
  priorSignExitDate: "January 24, 2047",
  previousResidencyEntryDate: "December 20, 2017",
  previousResidencyExitDate: "December 17, 2020"
};

try {
  const { createTransitSynastryRenderer } = await vite.ssrLoadModule(
    "/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts"
  );
  const renderer = createTransitSynastryRenderer(
    { authoredCards: [] },
    { templates: [] },
    { hookRows: [placement, education], vocabularyRows: [] }
  );
  const rendered = renderer.renderSkyPlacement(facts);
  assert.deepEqual(rendered.parts, [
    "January 24, 2047 to January 21, 2050",
    "Saturn education.",
    "Opening.",
    "Tension.",
    "Development.",
    "Era frame.",
    "Saturn moved through Sagittarius from October 31, 2044 to January 24, 2047.",
    "Saturn last moved through Capricorn from December 20, 2017 to December 17, 2020.",
    "Collective lesson.",
    "Close."
  ]);
  const eraSection = rendered.articleSections.find((section) => section.kind === "collective-era");
  assert.equal(eraSection?.heading, "", "The era layer must not invent a reader-facing heading.");
  assert.equal(
    eraSection?.body,
    [
      "Era frame.",
      "Saturn moved through Sagittarius from October 31, 2044 to January 24, 2047.",
      "Saturn last moved through Capricorn from December 20, 2017 to December 17, 2020.",
      "Collective lesson."
    ].join("\n\n")
  );

  const withoutEducation = createTransitSynastryRenderer(
    { authoredCards: [] },
    { templates: [] },
    { hookRows: [placement], vocabularyRows: [] }
  ).renderSkyPlacement(facts);
  assert.doesNotMatch(withoutEducation.body, /Saturn education/u, "A missing planet block must render nothing.");

  assert.throws(
    () => renderer.renderSkyPlacement({ ...facts, previousResidencyExitDate: null }),
    /SOURCE_GAP: slow-mover era layer saturn\/capricorn/u,
    "The era layer must fail closed without a complete prior-occurrence range."
  );

  const fastMoverRenderer = createTransitSynastryRenderer(
    { authoredCards: [] },
    { templates: [] },
    {
      hookRows: [{
        ...placement,
        contentKey: "fallback-hook/sky-sign-copy/mercury/capricorn"
      }],
      vocabularyRows: []
    }
  );
  assert.throws(
    () => fastMoverRenderer.renderSkyPlacement({ ...facts, planet: "mercury" }),
    /SOURCE_GAP: slow-mover era layer mercury\/capricorn/u,
    "Fast movers must not accept an era layer."
  );

  const candidate = JSON.parse(fs.readFileSync(path.join(
    repoRoot,
    "packages/astro-knowledge/review/saturn-capricorn-article-v3/candidate.json"
  ), "utf8"));
  const approvedSource = JSON.parse(fs.readFileSync(path.join(
    repoRoot,
    "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json"
  ), "utf8"));
  const approvedArticle = approvedSource.rows.find((row) => row.contentKey === candidate.contentKey);
  const approvedEducation = approvedSource.rows.find((row) => row.contentKey === candidate.planetEducationContentKey);
  assert.ok(approvedArticle, "The owner-approved Saturn in Capricorn source row must exist.");
  assert.ok(approvedEducation, "The owner-approved Saturn planet-education source row must exist.");
  assert.equal(approvedEducation.body, candidate.planetEducation.body, "The Saturn planet paragraph must stay byte-identical.");
  for (const field of ["fact_line", "aspect_insert", "opening", "tension", "development", "close"]) {
    assert.equal(approvedArticle[field], candidate.article[field], `The approved ${field} must stay byte-identical.`);
  }
  assert.deepEqual(approvedArticle.era_layer, candidate.article.era_layer, "The four approved era fields must stay byte-identical.");
  const approvedParagraphs = [
    approvedEducation.body,
    ...approvedArticle.opening.split("\n\n"),
    ...approvedArticle.tension.split("\n\n"),
    approvedArticle.development,
    approvedArticle.era_layer.frame,
    approvedArticle.era_layer.handoff,
    ...approvedArticle.era_layer.recurrence.split("\n\n"),
    approvedArticle.era_layer.collective_lesson,
    approvedArticle.close
  ];
  assert.equal(approvedParagraphs.length, 14, "The approved page must contain exactly fourteen article paragraphs.");

  const aspectSource = JSON.parse(fs.readFileSync(path.join(
    repoRoot,
    "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json"
  ), "utf8"));
  const approvedVenusAspect = aspectSource.hookRows.find((row) => (
    row.contentKey === candidate.aspectReplacementCandidate.contentKey
  ));
  assert.equal(approvedVenusAspect?.body_you, candidate.aspectReplacementCandidate.body);
  assert.equal(approvedVenusAspect?.body_they, candidate.aspectReplacementCandidate.body);
  assert.equal(approvedVenusAspect?.review_status, "approved");

  const allSourceRows = fs.readdirSync(path.join(
    repoRoot,
    "apps/web/src/content/fallbackArchitectureV3/source-rows"
  )).filter((file) => file.endsWith(".json")).flatMap((file) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(
      repoRoot,
      "apps/web/src/content/fallbackArchitectureV3/source-rows",
      file
    ), "utf8"));
    return [
      ...(Array.isArray(parsed.rows) ? parsed.rows : []),
      ...(Array.isArray(parsed.hookRows) ? parsed.hookRows : [])
    ];
  });
  assert.equal(
    allSourceRows.some((row) => /sky-aspect-sign\/(?:saturn\/capricorn\/trine\/(?:uranus|mercury)|(?:uranus|mercury)\/[^/]+\/trine\/saturn\/capricorn)/u.test(row.contentKey ?? "")),
    false,
    "Saturn trine Uranus and Saturn trine Mercury must remain fail-closed without interpretive source rows."
  );

  const candidateRenderer = createTransitSynastryRenderer(
    { authoredCards: [] },
    { templates: [] },
    {
      hookRows: [
        {
          ...candidate.article,
          contentKey: candidate.contentKey,
          content_role: "fallback_hook",
          grammar_frame: "continuous_editorial_unit",
          render_policy: "sky-placement-continuous-v2",
          review_status: "approved",
          source_keys: ["rendered-sample-test"]
        },
        {
          contentKey: candidate.planetEducationContentKey,
          content_role: "fallback_hook",
          grammar_frame: "collective_editorial_unit",
          render_policy: candidate.planetEducation.renderPolicy,
          body: candidate.planetEducation.body,
          review_status: "approved",
          source_keys: ["rendered-sample-test"]
        }
      ],
      vocabularyRows: []
    }
  );
  const sample = candidateRenderer.renderSkyPlacement(facts);
  assert.equal(sample.parts[1], candidate.planetEducation.body);
  assert.match(sample.body, /Saturn last moved through Capricorn from December 20, 2017 to December 17, 2020\./u);
  assert.match(sample.body, /Earlier Saturn-in-Capricorn periods also arrived during years/u);
  assert.equal(sample.parts.at(-1), candidate.article.close);
  assert.doesNotMatch(sample.body, /\{\{/u, "The rendered sample must resolve every engine token.");

  console.log("Slow-mover era layer passed: fourteen approved paragraphs and the Venus aspect stay byte-identical, Saturn trine Uranus/Mercury remain fail-closed, planet education is optional, all four era fields render without headings, year-aware facts resolve, and incomplete or fast-mover era data fails closed.");
} finally {
  await vite.close();
}
