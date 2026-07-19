"use strict";

const calculatedFor = "2026-07-19T12:00:00.000Z";

function activationId(movingBody, aspectType, targetNatalPlanet, patternId) {
  return [
    "activation",
    "aspect_pattern_activation_v1",
    calculatedFor,
    movingBody,
    aspectType,
    targetNatalPlanet,
    patternId
  ].join(".");
}

function transit(id, movingBody, targetNatalPlanet, aspectType, orb, applying, exactAt) {
  return {
    id,
    movingBody,
    targetNatalPlanet,
    aspectType,
    orb,
    applying,
    ...(exactAt ? { exactAt } : {})
  };
}

const isolatedTSquarePatternId = "aspect-pattern:t_square:uranus-pluto:apex-venus";
const yodPatternId = "aspect-pattern:yod:moon-venus:apex-saturn";
const mysticRectanglePatternId = "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto";
const kitePatternId = "aspect-pattern:kite:sun-moon-pluto:focal-uranus";
const kiteGrandTrinePatternId = "aspect-pattern:grand_trine:sun-moon-pluto";

const grandSquareMoonPatternIds = Object.freeze([
  "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
  "aspect-pattern:grand_square:moon-mars-uranus-pluto",
  "aspect-pattern:t_square:jupiter-pluto:apex-moon",
  "aspect-pattern:t_square:moon-mars:apex-jupiter",
  "aspect-pattern:t_square:moon-mars:apex-pluto",
  "aspect-pattern:t_square:moon-mars:apex-uranus",
  "aspect-pattern:t_square:uranus-pluto:apex-moon"
]);

const grandSquareCurrentDisplayOrder = Object.freeze([
  "aspect-pattern:grand_square:moon-mars-uranus-pluto",
  "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
  "aspect-pattern:t_square:moon-mars:apex-uranus",
  "aspect-pattern:t_square:moon-mars:apex-jupiter",
  "aspect-pattern:t_square:moon-mars:apex-pluto",
  "aspect-pattern:t_square:uranus-pluto:apex-moon",
  "aspect-pattern:t_square:jupiter-pluto:apex-moon",
  "aspect-pattern:t_square:uranus-pluto:apex-mars",
  "aspect-pattern:t_square:jupiter-pluto:apex-mars"
]);

function singleExpected({ movingBody, targetNatalPlanet, aspectType, patternId, roles, reasonCodes, score, sourceAspectId, exactAt = null }) {
  const id = activationId(movingBody, aspectType, targetNatalPlanet, patternId);
  return {
    activationIds: [id],
    activatedPatternIds: [patternId],
    triggerRoles: { [id]: roles },
    triggers: {
      [id]: {
        movingBody,
        targetNatalPlanet,
        aspectType,
        exactAt,
        sourceAspectId
      }
    },
    reasonCodes: { [id]: reasonCodes },
    scores: { [id]: score }
  };
}

const cases = Object.freeze([
  {
    id: "transit-to-t-square-apex",
    fixtureId: "isolated-t-square-a",
    classification: "none",
    calculatedFor,
    natalPatterns: Object.freeze([{ id: isolatedTSquarePatternId, type: "t_square", planets: ["venus", "uranus", "pluto"] }]),
    transitToNatalAspects: Object.freeze([
      transit("real-transit.mars.exact-square.venus", "mars", "venus", "square", 0, true, calculatedFor)
    ]),
    expected: Object.freeze({
      ...singleExpected({
        movingBody: "mars",
        targetNatalPlanet: "venus",
        aspectType: "square",
        patternId: isolatedTSquarePatternId,
        roles: ["apex"],
        reasonCodes: ["applying", "exact_or_tight", "targets_apex"],
        score: { aspectWeight: 8, exactnessWeight: 5, applyingWeight: 2, roleWeight: 4, sharedPlanetWeight: 0, total: 19 },
        sourceAspectId: "real-transit.mars.exact-square.venus",
        exactAt: calculatedFor
      }),
      natalDisplayOrder: [isolatedTSquarePatternId],
      currentDisplayOrder: [isolatedTSquarePatternId]
    })
  },
  {
    id: "transit-to-t-square-opposition-member",
    fixtureId: "isolated-t-square-a",
    classification: "none",
    calculatedFor,
    natalPatterns: Object.freeze([{ id: isolatedTSquarePatternId, type: "t_square", planets: ["venus", "uranus", "pluto"] }]),
    transitToNatalAspects: Object.freeze([
      transit("real-transit.saturn.opposition.uranus", "saturn", "uranus", "opposition", 1.2, false)
    ]),
    expected: Object.freeze({
      ...singleExpected({
        movingBody: "saturn",
        targetNatalPlanet: "uranus",
        aspectType: "opposition",
        patternId: isolatedTSquarePatternId,
        roles: ["opposition_axis"],
        reasonCodes: ["exact_or_tight"],
        score: { aspectWeight: 9, exactnessWeight: 3.8, applyingWeight: 0, roleWeight: 2, sharedPlanetWeight: 0, total: 14.8 },
        sourceAspectId: "real-transit.saturn.opposition.uranus"
      }),
      natalDisplayOrder: [isolatedTSquarePatternId],
      currentDisplayOrder: [isolatedTSquarePatternId]
    })
  },
  {
    id: "transit-to-grand-square-member-repeated",
    fixtureId: "grand-square-a",
    classification: "EXPECTED_OVERLAP",
    calculatedFor,
    natalPatterns: Object.freeze([
      { id: "aspect-pattern:grand_square:moon-mars-jupiter-pluto", type: "grand_square", planets: ["moon", "mars", "jupiter", "pluto"] },
      { id: "aspect-pattern:grand_square:moon-mars-uranus-pluto", type: "grand_square", planets: ["moon", "mars", "uranus", "pluto"] }
    ]),
    transitToNatalAspects: Object.freeze([
      transit("real-transit.saturn.square.moon", "saturn", "moon", "square", 0.4, true, "2026-07-19T18:00:00.000Z")
    ]),
    expected: Object.freeze({
      activationIds: grandSquareMoonPatternIds.map((patternId) => activationId("saturn", "square", "moon", patternId)),
      activatedPatternIds: grandSquareMoonPatternIds.slice(),
      triggerRoles: Object.fromEntries(grandSquareMoonPatternIds.map((patternId) => [
        activationId("saturn", "square", "moon", patternId),
        patternId.endsWith("apex-moon") ? ["apex"] : ["opposition_axis"]
      ])),
      reasonCodes: Object.fromEntries(grandSquareMoonPatternIds.map((patternId) => [
        activationId("saturn", "square", "moon", patternId),
        patternId.endsWith("apex-moon")
          ? ["activates_contained_pattern", "applying", "exact_or_tight", "targets_apex", "targets_luminary", "targets_repeated_planet"]
          : patternId.includes("grand_square")
            ? ["activates_parent_pattern", "applying", "exact_or_tight", "targets_luminary", "targets_repeated_planet"]
            : ["activates_contained_pattern", "applying", "exact_or_tight", "targets_luminary", "targets_repeated_planet"]
      ])),
      natalDisplayOrder: [
        "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "aspect-pattern:t_square:moon-mars:apex-uranus",
        "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "aspect-pattern:t_square:moon-mars:apex-pluto",
        "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "aspect-pattern:t_square:jupiter-pluto:apex-moon"
      ],
      currentDisplayOrder: grandSquareCurrentDisplayOrder.slice()
    })
  },
  {
    id: "transit-to-kite-focal-planet",
    fixtureId: "kite-a",
    classification: "none",
    calculatedFor,
    natalPatterns: Object.freeze([
      { id: kitePatternId, type: "kite", planets: ["sun", "moon", "uranus", "pluto"] },
      { id: kiteGrandTrinePatternId, type: "grand_trine", planets: ["sun", "moon", "pluto"] }
    ]),
    transitToNatalAspects: Object.freeze([
      transit("real-transit.mars.opposition.uranus", "mars", "uranus", "opposition", 0.8, true)
    ]),
    expected: Object.freeze({
      ...singleExpected({
        movingBody: "mars",
        targetNatalPlanet: "uranus",
        aspectType: "opposition",
        patternId: kitePatternId,
        roles: ["focal_planet", "spine"],
        reasonCodes: ["activates_parent_pattern", "applying", "exact_or_tight", "targets_focal_planet"],
        score: { aspectWeight: 9, exactnessWeight: 4.2, applyingWeight: 2, roleWeight: 5, sharedPlanetWeight: 0, total: 21.2 },
        sourceAspectId: "real-transit.mars.opposition.uranus"
      }),
      natalDisplayOrder: [kitePatternId, kiteGrandTrinePatternId],
      currentDisplayOrder: [kitePatternId, kiteGrandTrinePatternId]
    })
  },
  {
    id: "transit-to-kite-resource-planet",
    fixtureId: "kite-a",
    classification: "EXPECTED_OVERLAP",
    calculatedFor,
    natalPatterns: Object.freeze([
      { id: kitePatternId, type: "kite", planets: ["sun", "moon", "uranus", "pluto"] },
      { id: kiteGrandTrinePatternId, type: "grand_trine", planets: ["sun", "moon", "pluto"] }
    ]),
    transitToNatalAspects: Object.freeze([
      transit("real-transit.venus.trine.moon", "venus", "moon", "trine", 1.1, false)
    ]),
    expected: Object.freeze({
      activationIds: [
        activationId("venus", "trine", "moon", kiteGrandTrinePatternId),
        activationId("venus", "trine", "moon", kitePatternId)
      ],
      activatedPatternIds: [kiteGrandTrinePatternId, kitePatternId],
      triggerRoles: {
        [activationId("venus", "trine", "moon", kiteGrandTrinePatternId)]: [],
        [activationId("venus", "trine", "moon", kitePatternId)]: ["resource_planet"]
      },
      reasonCodes: {
        [activationId("venus", "trine", "moon", kiteGrandTrinePatternId)]: ["activates_contained_pattern", "exact_or_tight", "targets_luminary", "targets_repeated_planet"],
        [activationId("venus", "trine", "moon", kitePatternId)]: ["activates_parent_pattern", "exact_or_tight", "targets_luminary", "targets_repeated_planet"]
      },
      natalDisplayOrder: [kitePatternId, kiteGrandTrinePatternId],
      currentDisplayOrder: [kitePatternId, kiteGrandTrinePatternId]
    })
  },
  {
    id: "transit-to-yod-apex",
    fixtureId: "yod-wide-a",
    classification: "none",
    calculatedFor,
    natalPatterns: Object.freeze([{ id: yodPatternId, type: "yod", planets: ["moon", "venus", "saturn"] }]),
    transitToNatalAspects: Object.freeze([
      transit("real-transit.sun.quincunx.saturn", "sun", "saturn", "quincunx", 0.6, true, "2026-07-20T00:00:00.000Z")
    ]),
    expected: Object.freeze({
      ...singleExpected({
        movingBody: "sun",
        targetNatalPlanet: "saturn",
        aspectType: "quincunx",
        patternId: yodPatternId,
        roles: ["apex"],
        reasonCodes: ["applying", "exact_or_tight", "targets_apex"],
        score: { aspectWeight: 6, exactnessWeight: 4.4, applyingWeight: 2, roleWeight: 4, sharedPlanetWeight: 0, total: 16.4 },
        sourceAspectId: "real-transit.sun.quincunx.saturn",
        exactAt: "2026-07-20T00:00:00.000Z"
      }),
      natalDisplayOrder: [yodPatternId],
      currentDisplayOrder: [yodPatternId]
    })
  },
  {
    id: "transit-to-mystic-rectangle-member",
    fixtureId: "mystic-rectangle-a",
    classification: "none",
    calculatedFor,
    natalPatterns: Object.freeze([{ id: mysticRectanglePatternId, type: "mystic_rectangle", planets: ["moon", "jupiter", "uranus", "pluto"] }]),
    transitToNatalAspects: Object.freeze([
      transit("real-transit.mercury.sextile.jupiter", "mercury", "jupiter", "sextile", 2.2, false)
    ]),
    expected: Object.freeze({
      ...singleExpected({
        movingBody: "mercury",
        targetNatalPlanet: "jupiter",
        aspectType: "sextile",
        patternId: mysticRectanglePatternId,
        roles: ["opposition_axis"],
        reasonCodes: ["exact_or_tight"],
        score: { aspectWeight: 4, exactnessWeight: 2.8, applyingWeight: 0, roleWeight: 2, sharedPlanetWeight: 0, total: 8.8 },
        sourceAspectId: "real-transit.mercury.sextile.jupiter"
      }),
      natalDisplayOrder: [mysticRectanglePatternId],
      currentDisplayOrder: [mysticRectanglePatternId]
    })
  },
  {
    id: "multiple-transits-same-pattern",
    fixtureId: "isolated-t-square-a",
    classification: "none",
    calculatedFor,
    natalPatterns: Object.freeze([{ id: isolatedTSquarePatternId, type: "t_square", planets: ["venus", "uranus", "pluto"] }]),
    transitToNatalAspects: Object.freeze([
      transit("real-transit.mars.square.venus", "mars", "venus", "square", 0.2, true),
      transit("real-transit.jupiter.trine.pluto", "jupiter", "pluto", "trine", 1.5, false)
    ]),
    expected: Object.freeze({
      activationIds: [
        activationId("jupiter", "trine", "pluto", isolatedTSquarePatternId),
        activationId("mars", "square", "venus", isolatedTSquarePatternId)
      ],
      activatedPatternIds: [isolatedTSquarePatternId, isolatedTSquarePatternId],
      triggerRoles: {
        [activationId("jupiter", "trine", "pluto", isolatedTSquarePatternId)]: ["opposition_axis"],
        [activationId("mars", "square", "venus", isolatedTSquarePatternId)]: ["apex"]
      },
      reasonCodes: {
        [activationId("jupiter", "trine", "pluto", isolatedTSquarePatternId)]: ["exact_or_tight"],
        [activationId("mars", "square", "venus", isolatedTSquarePatternId)]: ["applying", "exact_or_tight", "targets_apex"]
      },
      natalDisplayOrder: [isolatedTSquarePatternId],
      currentDisplayOrder: [isolatedTSquarePatternId]
    })
  },
  {
    id: "no-matching-transit",
    fixtureId: "isolated-t-square-a",
    classification: "none",
    calculatedFor,
    natalPatterns: Object.freeze([{ id: isolatedTSquarePatternId, type: "t_square", planets: ["venus", "uranus", "pluto"] }]),
    transitToNatalAspects: Object.freeze([
      transit("real-transit.sun.square.moon", "sun", "moon", "square", 0.8, true)
    ]),
    expected: Object.freeze({
      activationIds: [],
      activatedPatternIds: [],
      triggerRoles: {},
      reasonCodes: {},
      natalDisplayOrder: [isolatedTSquarePatternId],
      currentDisplayOrder: [isolatedTSquarePatternId]
    })
  },
  {
    id: "unknown-birth-time",
    fixtureId: "unknown-birth-time-a",
    classification: "none",
    calculatedFor,
    natalPatterns: Object.freeze([{ id: isolatedTSquarePatternId, type: "t_square", planets: ["venus", "uranus", "pluto"] }]),
    transitToNatalAspects: Object.freeze([
      transit("real-transit.mars.square.venus", "mars", "venus", "square", 0.3, true)
    ]),
    expected: Object.freeze({
      ...singleExpected({
        movingBody: "mars",
        targetNatalPlanet: "venus",
        aspectType: "square",
        patternId: isolatedTSquarePatternId,
        roles: ["apex"],
        reasonCodes: ["applying", "exact_or_tight", "targets_apex"],
        score: { aspectWeight: 8, exactnessWeight: 4.7, applyingWeight: 2, roleWeight: 4, sharedPlanetWeight: 0, total: 18.7 },
        sourceAspectId: "real-transit.mars.square.venus"
      }),
      natalDisplayOrder: [isolatedTSquarePatternId],
      currentDisplayOrder: [isolatedTSquarePatternId]
    })
  }
]);

module.exports = {
  calculatedFor,
  cases
};
