import assert from "node:assert/strict";
import {
  houseHoroscopeCoreHeadline,
  natalPlanetInSignTemplateHeadline,
  natalPlanetInSignTemplateTitle,
  packageDraftChanges,
  renderWorkspacePreview,
  setSkyPlacementCompositionOption,
  setPackageValueAt,
  skyFallbackIdentity,
  skyPlacementCompositionOptions,
  skyPlacementFrameTemplateKey,
  skyFallbackWorkspace
} from "../apps/admin/src/skyFallbackWorkspace.ts";

const original = {
  contentKey: "fallback-hook/sky-sign-copy/jupiter/leo",
  content_role: "fallback_hook",
  grammar_frame: "continuous_editorial_unit",
  render_policy: "sky-placement-continuous-v2",
  fact_line: "{{entryDate}} to {{exitDate}}",
  aspect_insert: "{{aspectInsert}}",
  opening: "Jupiter enters Leo on {{entryDate}}.",
  tension: "Attention can become the measure.",
  development: "The work can keep its own shape.",
  close: "Before {{exitDate}}, choose the work.",
  review_status: "approved"
};

const workspace = skyFallbackWorkspace(original.contentKey, { packageRecord: original });
assert.ok(workspace);
assert.equal(workspace.kind, "article");
assert.deepEqual(workspace.variables, ["aspectInsert", "entryDate", "exitDate"]);
assert.deepEqual(workspace.fields.map((field) => field.key), ["fact_line", "opening", "tension", "development", "close"]);
assert.deepEqual(workspace.fields.map((field) => field.label), [
  "Calculated date line",
  "Opening paragraphs",
  "Complication paragraphs",
  "Development / turn",
  "Final paragraph"
]);
assert.deepEqual(skyFallbackIdentity(original.contentKey), {
  title: "Jupiter in Leo",
  typeLabel: "Full Sky Placement article",
  groupKey: "articles",
  groupLabel: "Sky Placement articles"
});
assert.deepEqual(skyFallbackIdentity("fallback-hook/sky-placement/sun"), {
  title: "Sun · Transit dates and opening",
  typeLabel: "Transit dates and opening",
  description: "Shared Sun opening with calculated sign, entry date, and exit date. Used across all Sun placement pages.",
  groupKey: "supporting",
  groupLabel: "Sky Placement template parts"
});
assert.deepEqual(skyFallbackIdentity("fallback-hook/sky-placement-frame/sun"), {
  title: "Sun · About the Sun",
  typeLabel: "About the Sun",
  description: "Shared explanation of what the Sun governs and how its transit shows up. Used across all Sun placement pages.",
  groupKey: "supporting",
  groupLabel: "Sky Placement template parts"
});
assert.deepEqual(skyFallbackIdentity("fallback-hook/sky-placement-lore/aquarius"), {
  title: "Aquarius · About the sign",
  typeLabel: "About the sign",
  description: "Reusable Aquarius history, symbol, ruler, and seasonal context for Sky Placement fallback pages. This is an independent copy of the Sky Season lore and can be reviewed separately.",
  groupKey: "supporting",
  groupLabel: "Sky Placement template parts"
});
assert.deepEqual(skyFallbackIdentity("fallback-hook/sky-placement-sign/sun/virgo"), {
  title: "Sun in Virgo",
  typeLabel: "Planet-in-sign interpretation",
  description: "Sign-specific interpretation used when Sun is in Virgo.",
  groupKey: "supporting",
  groupLabel: "Sky Placement template parts"
});
const placementPlanets = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"
];
const placementSigns = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
placementPlanets.forEach((planet) => {
  assert.equal(
    skyFallbackIdentity(`fallback-hook/sky-placement/${planet}`)?.typeLabel,
    "Transit dates and opening",
    `${planet} must receive the shared opening label.`
  );
  assert.match(
    skyFallbackIdentity(`fallback-hook/sky-placement-frame/${planet}`)?.typeLabel ?? "",
    /^About /u,
    `${planet} must receive the planet explanation label.`
  );
  placementSigns.forEach((sign) => {
    assert.equal(
      skyFallbackIdentity(`fallback-hook/sky-placement-sign/${planet}/${sign}`)?.typeLabel,
      "Planet-in-sign interpretation",
      `${planet} in ${sign} must receive the sign interpretation label.`
    );
  });
});
assert.equal(
  skyFallbackIdentity("fallback-hook/sky-placement-frame/north-node")?.title,
  "North Node · About the North Node"
);

const placementFrameTemplate = {
  contentKey: skyPlacementFrameTemplateKey,
  compositionOptions: {
    includePlanetLore: true,
    includeSignLore: true
  }
};
assert.deepEqual(skyFallbackIdentity(skyPlacementFrameTemplateKey), {
  title: "Sky Placement fallback page template",
  typeLabel: "Canonical Sky Placement fallback template",
  description: "Assembles the complete fallback page from transit dates, the planet explanation, sign history and symbolism, the planet-in-sign interpretation, and any approved current aspects.",
  groupKey: "supporting",
  groupLabel: "Sky Placement template parts"
});
assert.deepEqual(skyPlacementCompositionOptions(placementFrameTemplate), {
  includePlanetLore: true,
  includeSignLore: true
});
const signLoreDisabled = setSkyPlacementCompositionOption(placementFrameTemplate, "includeSignLore", false);
assert.deepEqual(skyPlacementCompositionOptions(signLoreDisabled), {
  includePlanetLore: true,
  includeSignLore: false
});
assert.deepEqual(placementFrameTemplate.compositionOptions, {
  includePlanetLore: true,
  includeSignLore: true
}, "Changing a template option must not mutate the package original.");
assert.deepEqual(packageDraftChanges({
  packageRecord: placementFrameTemplate,
  packageDraft: signLoreDisabled
}), [{
  key: "compositionOptions.includeSignLore",
  label: "Include sign history and symbolism",
  before: "Included",
  after: "Excluded"
}]);
assert.equal(skyFallbackIdentity("house-horoscope-core/jupiter/leo/house-10")?.title, "Jupiter in Leo · 10th House");
assert.equal(
  houseHoroscopeCoreHeadline("house-horoscope-core/jupiter/leo/house-1", "House 1"),
  "Jupiter in Leo · 1st House"
);
assert.equal(houseHoroscopeCoreHeadline("fallback-template/natal.house-context", "House context"), "House context");
assert.equal(
  natalPlanetInSignTemplateHeadline("fallback-template/natal.planet-in-sign/sun", "{{planetTitle}} in {{signTitle}}"),
  "Sun in {{signTitle}}"
);
assert.equal(
  natalPlanetInSignTemplateHeadline("fallback-template/natal.planet-in-sign/north-node", "Planet in Sign"),
  "North Node in {{signTitle}}"
);
assert.equal(
  natalPlanetInSignTemplateTitle("fallback-template/natal.planet-in-sign/jupiter", "{{planetTitle}} in {{signTitle}}"),
  "Jupiter in a Sign"
);
assert.equal(natalPlanetInSignTemplateTitle("fallback-template/natal.house-context", "Planet in Sign"), null);
assert.deepEqual(skyFallbackIdentity("fallback-hook/sky-placement-lived/jupiter/leo"), {
  title: "Jupiter in Leo · How it shows up",
  typeLabel: "Sky Placement fallback article section",
  groupKey: "supporting",
  groupLabel: "Sky Placement fallback articles"
});
assert.equal(
  skyFallbackIdentity("fallback-hook/sky-placement-tagline/jupiter/leo")?.title,
  "Jupiter in Leo · Short headline"
);
assert.equal(
  skyFallbackIdentity("fallback-hook/sky-placement-hook/jupiter/leo")?.title,
  "Jupiter in Leo · Opening"
);
assert.equal(
  skyFallbackIdentity("fallback-hook/sky-placement-turn/jupiter/leo")?.title,
  "Jupiter in Leo · Challenge and response"
);
assert.equal(
  skyFallbackIdentity("fallback-hook/sky-aspect-sign/sun/leo/trine/chiron/taurus")?.title,
  "Sun in Leo Trine Chiron in Taurus"
);

const packageDraft = setPackageValueAt(structuredClone(original), "development", "The work keeps its own shape.");
assert.equal(original.development, "The work can keep its own shape.", "The package original must stay immutable.");

const sections = { packageRecord: original, packageDraft };
assert.deepEqual(packageDraftChanges(sections), [{
  key: "development",
  label: "Development / turn",
  before: "The work can keep its own shape.",
  after: "The work keeps its own shape."
}]);

const proposed = skyFallbackWorkspace(original.contentKey, sections);
assert.ok(proposed);
assert.deepEqual(renderWorkspacePreview(proposed.fields, {
  entryDate: "June 30, 2026",
  exitDate: "July 26, 2027"
}), [
  "Jupiter enters Leo on June 30, 2026.",
  "Attention can become the measure.",
  "The work keeps its own shape.",
  "Before July 26, 2027, choose the work."
]);

console.log("Admin Sky fallback workspace test passed.");
