"use strict";

const SIGNS = Object.freeze([
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
]);

const TRADITIONAL_PLANETS = Object.freeze([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn"
]);

const TRADITIONAL_RULERS = Object.freeze({
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter"
});

const HOUSE_TOPICS = Object.freeze({
  1: "self, body, vitality, and the year's overall direction",
  2: "money, resources, livelihood, and movable goods",
  3: "siblings, neighbors, short trips, daily communication, and learning",
  4: "home, family, parents, foundations, property, and endings",
  5: "children, creativity, pleasure, romance, and speculation",
  6: "work, routine, health, illness, subordinates, and daily grind",
  7: "marriage, partners, clients, open opponents, and one-to-one dealings",
  8: "shared resources, debt, other people's money, crisis, and major transition",
  9: "travel, foreigners, higher learning, religion, philosophy, and publishing",
  10: "career, action, reputation, public standing, and authority",
  11: "friends, allies, groups, patrons, hopes, goals, and gains",
  12: "seclusion, loss, hidden things, self-undoing, hidden opponents, and retreat"
});

const TRANSIT_WEIGHTS = Object.freeze({
  transitingBody: Object.freeze({
    pluto: 10,
    neptune: 9,
    uranus: 9,
    saturn: 8,
    jupiter: 6,
    mars: 4,
    sun: 3,
    venus: 3,
    mercury: 2,
    moon: 1
  }),
  aspect: Object.freeze({
    conjunction: 10,
    opposition: 8,
    square: 8,
    trine: 5,
    sextile: 4
  }),
  target: Object.freeze({
    sun: 10,
    moon: 10,
    ascendant: 9,
    mc: 9,
    descendant: 9,
    ic: 9,
    mercury: 6,
    venus: 6,
    mars: 6,
    nodes: 5,
    north_node: 5,
    south_node: 5,
    jupiter: 4,
    saturn: 4,
    chiron: 4,
    uranus: 3,
    neptune: 3,
    pluto: 3
  })
});

const SIGNIFICANCE_LABELS = Object.freeze([
  { min: 80, label: "major theme" },
  { min: 50, label: "active theme" },
  { min: 25, label: "background influence" },
  { min: 0, label: "low priority" }
]);

module.exports = {
  HOUSE_TOPICS,
  SIGNIFICANCE_LABELS,
  SIGNS,
  TRADITIONAL_PLANETS,
  TRADITIONAL_RULERS,
  TRANSIT_WEIGHTS
};
