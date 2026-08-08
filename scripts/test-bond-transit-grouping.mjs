#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  contactsForBondTransitGroup,
  dedupeBondTransitEndpointCandidates,
  groupBondTransitActivations,
  rankBondTransitGroups
} from "../apps/web/src/services/bondTransitGrouping.ts";
import fs from "node:fs";

const packageRoot = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/",
  import.meta.url
);
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(new URL(relativePath, packageRoot), "utf8")
);
const transitRows = readJson("source-rows/transit-synastry-rows-v1.json");
const sourceRows = readJson("source-rows/fallback-source-rows-v3.json");
const templates = readJson("templates/fallback-templates-v3.json");
const renderer = createTransitSynastryRenderer(transitRows, templates, sourceRows);

const activation = {
  id: "saturn-activation",
  transitPlanet: "Saturn",
  transitSign: "Aries"
};
const candidate = ({
  contactId,
  counterpartPlanet,
  endpointOwner,
  endpointPlanet,
  aspect
}) => ({
  activation,
  activationId: activation.id,
  aspect,
  contactId,
  counterpartPlanet,
  endpointOwner,
  endpointPlanet,
  transiting: "saturn"
});

const joseGroups = groupBondTransitActivations([
  candidate({
    contactId: "moon-mars",
    counterpartPlanet: "Moon",
    endpointOwner: "friend",
    endpointPlanet: "Mars",
    aspect: "sextile"
  }),
  candidate({
    contactId: "midheaven-mars",
    counterpartPlanet: "Midheaven",
    endpointOwner: "friend",
    endpointPlanet: "Mars",
    aspect: "sextile"
  }),
  candidate({
    contactId: "lilith-mars",
    counterpartPlanet: "Lilith",
    endpointOwner: "friend",
    endpointPlanet: "Mars",
    aspect: "sextile"
  })
]);
assert.equal(joseGroups.length, 1);
assert.deepEqual(joseGroups[0].activatedPlanets, ["Moon", "Midheaven", "Lilith"]);
const joseCard = renderer.renderBondTransit({
  transiting: joseGroups[0].transiting,
  aspect: joseGroups[0].aspect,
  endpointPlanet: joseGroups[0].endpointPlanet,
  endpointOwner: joseGroups[0].endpointOwner,
  activatedPlanets: joseGroups[0].activatedPlanets,
  otherName: "Jose",
  friendPossessivePronoun: "his",
  sign: "aries",
  window: "Until November 13"
});
assert.equal(joseCard.headline, "Saturn sextile Jose's Mars");
assert.equal(joseCard.parts.length, 2);
assert.equal(
  joseCard.parts[1],
  "Saturn in Aries is sextile Jose's Mars through November 13, activating the connections his Mars makes with your Moon, your Midheaven, and your Lilith."
);

const chrisGroups = groupBondTransitActivations([
  candidate({
    contactId: "venus-mercury",
    counterpartPlanet: "Mercury",
    endpointOwner: "reader",
    endpointPlanet: "Venus",
    aspect: "square"
  }),
  candidate({
    contactId: "venus-saturn",
    counterpartPlanet: "Saturn",
    endpointOwner: "reader",
    endpointPlanet: "Venus",
    aspect: "square"
  }),
  candidate({
    contactId: "venus-midheaven",
    counterpartPlanet: "Midheaven",
    endpointOwner: "reader",
    endpointPlanet: "Venus",
    aspect: "square"
  })
]);
assert.equal(chrisGroups.length, 1);
assert.deepEqual(chrisGroups[0].activatedPlanets, ["Mercury", "Saturn", "Midheaven"]);
assert.deepEqual(
  contactsForBondTransitGroup(chrisGroups[0], [
    { id: "venus-midheaven", label: "third" },
    { id: "venus-mercury", label: "first" },
    { id: "unrelated", label: "ignored" },
    { id: "venus-saturn", label: "second" }
  ]).map((contact) => contact.label),
  ["first", "second", "third"],
  "The detail view must preserve the activated-contact order and omit unrelated contacts."
);
const chrisCard = renderer.renderBondTransit({
  transiting: chrisGroups[0].transiting,
  aspect: chrisGroups[0].aspect,
  endpointPlanet: chrisGroups[0].endpointPlanet,
  endpointOwner: chrisGroups[0].endpointOwner,
  activatedPlanets: chrisGroups[0].activatedPlanets,
  otherName: "Chris",
  friendPossessivePronoun: "his",
  sign: "aries",
  window: "Until November 13"
});
assert.equal(chrisCard.headline, "Saturn square your Venus");
assert.equal(
  chrisCard.parts[1],
  "Saturn in Aries is square your Venus through November 13, activating the connections it makes with Chris's Mercury, Saturn, and Midheaven."
);
assert.doesNotMatch(chrisCard.headline, /connection/iu);
assert.doesNotMatch(chrisCard.body, /aspect(?:s|ing)? (?:to|the) connection/iu);

const single = renderer.renderBondTransit({
  transiting: "saturn",
  aspect: "sextile",
  endpointPlanet: "mars",
  endpointOwner: "friend",
  activatedPlanets: ["moon"],
  otherName: "Jose",
  friendPossessivePronoun: "his",
  sign: "aries",
  window: "Until November 13"
});
assert.equal(
  single.parts[1],
  "Saturn in Aries is sextile Jose's Mars through November 13, activating the connection it makes with your Moon."
);

const differentEndpoints = groupBondTransitActivations([
  candidate({
    contactId: "moon-mars",
    counterpartPlanet: "Moon",
    endpointOwner: "friend",
    endpointPlanet: "Mars",
    aspect: "sextile"
  }),
  candidate({
    contactId: "moon-venus",
    counterpartPlanet: "Moon",
    endpointOwner: "friend",
    endpointPlanet: "Venus",
    aspect: "sextile"
  })
]);
assert.equal(
  differentEndpoints.length,
  2,
  "Contacts activated through different endpoints must remain separate events."
);

for (const aspect of ["conjunction", "sextile", "trine", "square", "opposition"]) {
  for (const endpointOwner of ["reader", "friend"]) {
    const card = renderer.renderBondTransit({
      transiting: "saturn",
      aspect,
      endpointPlanet: "venus",
      endpointOwner,
      activatedPlanets: ["mercury"],
      otherName: "Chris",
      friendPossessivePronoun: "his",
      sign: "aries",
      window: "Until November 13"
    });
    assert.doesNotMatch(
      card.headline,
      /connection/iu,
      `${aspect}/${endpointOwner} headline must name the endpoint, never the contact pair.`
    );
    assert.doesNotMatch(
      card.parts[1],
      /(?:aspect|meeting|squaring|trine|sextile).+the connection between/iu,
      `${aspect}/${endpointOwner} closing must aspect the endpoint, never the connection.`
    );
  }
}

for (const cards of [[joseCard], [chrisCard], [single]]) {
  assert.equal(
    new Set(cards.map((card) => card.parts[0])).size,
    cards.length,
    "No two bond cards on one chart view may share an identical effect body."
  );
}

// One transiting planet reaching both endpoints of the SAME contact is one sky event:
// keep only the tighter-orb endpoint. Different contacts stay separate (asserted above).
const readerVenusEnd = {
  ...candidate({
    contactId: "venus-pluto",
    counterpartPlanet: "Pluto",
    endpointOwner: "reader",
    endpointPlanet: "Venus",
    aspect: "square"
  }),
  activation: { ...activation, orb: 0.4 }
};
const friendPlutoEnd = {
  ...candidate({
    contactId: "venus-pluto",
    counterpartPlanet: "Venus",
    endpointOwner: "friend",
    endpointPlanet: "Pluto",
    aspect: "opposition"
  }),
  activation: { ...activation, orb: 0.9 }
};
const otherContact = {
  ...candidate({
    contactId: "moon-mars",
    counterpartPlanet: "Moon",
    endpointOwner: "friend",
    endpointPlanet: "Mars",
    aspect: "sextile"
  }),
  activation: { ...activation, orb: 0.7 }
};
const deduped = dedupeBondTransitEndpointCandidates(
  [friendPlutoEnd, readerVenusEnd, otherContact],
  (transit) => transit.orb
);
assert.deepEqual(
  deduped.map((entry) => `${entry.contactId}:${entry.endpointOwner}`),
  ["venus-pluto:reader", "moon-mars:friend"],
  "Both-endpoint activations of one contact must collapse to the tighter-orb endpoint."
);
const tied = dedupeBondTransitEndpointCandidates(
  [
    { ...friendPlutoEnd, activation: { ...activation, orb: 0.5 } },
    { ...readerVenusEnd, activation: { ...activation, orb: 0.5 } }
  ],
  (transit) => transit.orb
);
assert.deepEqual(
  tied.map((entry) => entry.endpointOwner),
  ["reader"],
  "An orb tie must keep the reader endpoint."
);

// Ranking: slow planets outrank fast ones; ties break on orb tightness. This runs
// before the surface's 3-card cap so a Moon card cannot crowd out a Saturn card.
const rankedGroups = rankBondTransitGroups(
  groupBondTransitActivations([
    {
      ...candidate({
        contactId: "moon-moon",
        counterpartPlanet: "Moon",
        endpointOwner: "reader",
        endpointPlanet: "Moon",
        aspect: "conjunction"
      }),
      transiting: "moon",
      activation: { ...activation, orb: 0.1 }
    },
    {
      ...candidate({
        contactId: "venus-saturn-wide",
        counterpartPlanet: "Saturn",
        endpointOwner: "reader",
        endpointPlanet: "Mars",
        aspect: "square"
      }),
      activation: { ...activation, orb: 0.8 }
    },
    {
      ...candidate({
        contactId: "venus-pluto",
        counterpartPlanet: "Pluto",
        endpointOwner: "reader",
        endpointPlanet: "Venus",
        aspect: "square"
      }),
      activation: { ...activation, orb: 0.4 }
    }
  ]),
  (transit) => transit.orb
);
assert.deepEqual(
  rankedGroups.map((group) => `${group.transiting}:${group.endpointPlanet}`),
  ["saturn:venus", "saturn:mars", "moon:moon"],
  "Ranking must put slow planets first, then tighter orbs; the Moon ranks last."
);

// Duplicate effect bodies: two cards sharing transiting planet + exact aspect must not
// repeat the same effect paragraph. duplicateIndex > 0 rotates to the family lane.
const firstSaturnSquare = renderer.renderBondTransit({
  transiting: "saturn",
  aspect: "square",
  endpointPlanet: "venus",
  endpointOwner: "reader",
  activatedPlanets: ["pluto"],
  otherName: "Chris",
  friendPossessivePronoun: "his",
  sign: "aries",
  duplicateIndex: 0,
  window: "Until November 13"
});
const secondSaturnSquare = renderer.renderBondTransit({
  transiting: "saturn",
  aspect: "square",
  endpointPlanet: "mars",
  endpointOwner: "reader",
  activatedPlanets: ["moon"],
  otherName: "Chris",
  friendPossessivePronoun: "his",
  sign: "aries",
  variant: 2,
  duplicateIndex: 1,
  window: "Until November 13"
});
assert.notEqual(
  firstSaturnSquare.parts[0],
  secondSaturnSquare.parts[0],
  "Cards sharing a transiting planet and exact aspect must rotate the effect body."
);

console.log("bond transit grouping passed: friend endpoint, reader endpoint, single contact, separate endpoints, both-endpoint dedupe, ranking, and duplicate rotation");
