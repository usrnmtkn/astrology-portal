#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  groupBondTransitActivations
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

console.log("bond transit grouping passed: friend endpoint, reader endpoint, single contact, and separate endpoints");
