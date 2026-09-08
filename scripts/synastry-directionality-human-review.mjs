// Human-reviewed semantic directionality decisions for Friends synastry.
// Review date: 2026-09-08
// Scope: fallback-hook/synastry-pair/*
// This file classifies existing serving rows only. It does not authorize serving changes.
//
// Default after line-by-line review:
// - distinct-body pair/aspect => AUTHOR_REVERSE
// - existing arrow follows canonical planet1 -> planet2 unless explicitly reversed below
//
// Exceptions are listed explicitly. The builder/test must fail if these rules do not
// expand to exactly 483 governed rows / 161 canonical pairs.

export const DIRECTIONALITY_ACTION = Object.freeze({
  AUTHOR_REVERSE: "AUTHOR_REVERSE",
  RECIPROCAL_NO_REVERSE: "RECIPROCAL_NO_REVERSE",
  NEEDS_DIRECTION_REVIEW: "NEEDS_DIRECTION_REVIEW"
});

export const RECIPROCAL_ALL_ASPECT_PAIRS = new Set([
  "chiron/chiron",
  "jupiter/jupiter",
  "jupiter/neptune",
  "jupiter/pluto",
  "jupiter/uranus",
  "lilith/lilith",
  "mars/mars",
  "mercury/mercury",
  "moon/moon",
  "neptune/neptune",
  "neptune/pluto",
  "north-node/north-node",
  "north-node/south-node",
  "pluto/pluto",
  "saturn/neptune",
  "saturn/pluto",
  "saturn/saturn",
  "saturn/uranus",
  "south-node/south-node",
  "sun/sun",
  "uranus/neptune",
  "uranus/pluto",
  "uranus/uranus",
  "venus/venus"
]);

export const NEEDS_REVIEW_ALL_ASPECT_PAIRS = new Set([
  "chiron/lilith",
  "chiron/south-node",
  "south-node/lilith"
]);

export const ACTION_OVERRIDES_BY_CONTENT_KEY = new Map(Object.entries({
  "fallback-hook/synastry-pair/moon/south-node/soft": "RECIPROCAL_NO_REVERSE",
  "fallback-hook/synastry-pair/south-node/ascendant/soft": "RECIPROCAL_NO_REVERSE",
  "fallback-hook/synastry-pair/venus/mars/hard": "NEEDS_DIRECTION_REVIEW",
  "fallback-hook/synastry-pair/venus/neptune/soft": "RECIPROCAL_NO_REVERSE",
  "fallback-hook/synastry-pair/venus/pluto/hard": "RECIPROCAL_NO_REVERSE"
}));

export const REVERSED_EXISTING_ARROW_KEYS = new Set([
  "fallback-hook/synastry-pair/chiron/ascendant/hard",
  "fallback-hook/synastry-pair/jupiter/saturn/conjunction",
  "fallback-hook/synastry-pair/jupiter/saturn/hard",
  "fallback-hook/synastry-pair/jupiter/saturn/soft",
  "fallback-hook/synastry-pair/mars/jupiter/conjunction",
  "fallback-hook/synastry-pair/mars/jupiter/hard",
  "fallback-hook/synastry-pair/mars/jupiter/soft",
  "fallback-hook/synastry-pair/mars/neptune/conjunction",
  "fallback-hook/synastry-pair/mars/neptune/hard",
  "fallback-hook/synastry-pair/mars/neptune/soft",
  "fallback-hook/synastry-pair/mars/pluto/conjunction",
  "fallback-hook/synastry-pair/mars/pluto/hard",
  "fallback-hook/synastry-pair/mars/pluto/soft",
  "fallback-hook/synastry-pair/mars/saturn/conjunction",
  "fallback-hook/synastry-pair/mars/saturn/hard",
  "fallback-hook/synastry-pair/mars/saturn/soft",
  "fallback-hook/synastry-pair/mars/uranus/conjunction",
  "fallback-hook/synastry-pair/mars/uranus/hard",
  "fallback-hook/synastry-pair/mercury/jupiter/conjunction",
  "fallback-hook/synastry-pair/mercury/jupiter/hard",
  "fallback-hook/synastry-pair/mercury/jupiter/soft",
  "fallback-hook/synastry-pair/mercury/mars/hard",
  "fallback-hook/synastry-pair/mercury/neptune/hard",
  "fallback-hook/synastry-pair/mercury/pluto/conjunction",
  "fallback-hook/synastry-pair/mercury/pluto/hard",
  "fallback-hook/synastry-pair/mercury/pluto/soft",
  "fallback-hook/synastry-pair/mercury/saturn/conjunction",
  "fallback-hook/synastry-pair/mercury/saturn/hard",
  "fallback-hook/synastry-pair/mercury/saturn/soft",
  "fallback-hook/synastry-pair/mercury/uranus/conjunction",
  "fallback-hook/synastry-pair/mercury/uranus/hard",
  "fallback-hook/synastry-pair/mercury/uranus/soft",
  "fallback-hook/synastry-pair/moon/jupiter/conjunction",
  "fallback-hook/synastry-pair/moon/jupiter/hard",
  "fallback-hook/synastry-pair/moon/jupiter/soft",
  "fallback-hook/synastry-pair/moon/mars/conjunction",
  "fallback-hook/synastry-pair/moon/mars/soft",
  "fallback-hook/synastry-pair/moon/neptune/conjunction",
  "fallback-hook/synastry-pair/moon/neptune/hard",
  "fallback-hook/synastry-pair/moon/neptune/soft",
  "fallback-hook/synastry-pair/moon/pluto/conjunction",
  "fallback-hook/synastry-pair/moon/pluto/hard",
  "fallback-hook/synastry-pair/moon/pluto/soft",
  "fallback-hook/synastry-pair/moon/saturn/conjunction",
  "fallback-hook/synastry-pair/moon/saturn/hard",
  "fallback-hook/synastry-pair/moon/saturn/soft",
  "fallback-hook/synastry-pair/moon/uranus/conjunction",
  "fallback-hook/synastry-pair/moon/uranus/hard",
  "fallback-hook/synastry-pair/moon/uranus/soft",
  "fallback-hook/synastry-pair/moon/venus/conjunction",
  "fallback-hook/synastry-pair/moon/venus/hard",
  "fallback-hook/synastry-pair/moon/venus/soft",
  "fallback-hook/synastry-pair/north-node/lilith/conjunction",
  "fallback-hook/synastry-pair/north-node/lilith/hard",
  "fallback-hook/synastry-pair/north-node/lilith/soft",
  "fallback-hook/synastry-pair/sun/jupiter/conjunction",
  "fallback-hook/synastry-pair/sun/jupiter/hard",
  "fallback-hook/synastry-pair/sun/jupiter/soft",
  "fallback-hook/synastry-pair/sun/mars/hard",
  "fallback-hook/synastry-pair/sun/mercury/conjunction",
  "fallback-hook/synastry-pair/sun/mercury/hard",
  "fallback-hook/synastry-pair/sun/mercury/soft",
  "fallback-hook/synastry-pair/sun/neptune/conjunction",
  "fallback-hook/synastry-pair/sun/neptune/hard",
  "fallback-hook/synastry-pair/sun/neptune/soft",
  "fallback-hook/synastry-pair/sun/pluto/conjunction",
  "fallback-hook/synastry-pair/sun/pluto/hard",
  "fallback-hook/synastry-pair/sun/pluto/soft",
  "fallback-hook/synastry-pair/sun/saturn/conjunction",
  "fallback-hook/synastry-pair/sun/saturn/hard",
  "fallback-hook/synastry-pair/sun/saturn/soft",
  "fallback-hook/synastry-pair/sun/uranus/conjunction",
  "fallback-hook/synastry-pair/sun/uranus/hard",
  "fallback-hook/synastry-pair/sun/uranus/soft",
  "fallback-hook/synastry-pair/sun/venus/conjunction",
  "fallback-hook/synastry-pair/sun/venus/hard",
  "fallback-hook/synastry-pair/sun/venus/soft",
  "fallback-hook/synastry-pair/venus/jupiter/conjunction",
  "fallback-hook/synastry-pair/venus/jupiter/hard",
  "fallback-hook/synastry-pair/venus/mars/conjunction",
  "fallback-hook/synastry-pair/venus/neptune/conjunction",
  "fallback-hook/synastry-pair/venus/neptune/hard",
  "fallback-hook/synastry-pair/venus/pluto/conjunction",
  "fallback-hook/synastry-pair/venus/pluto/soft",
  "fallback-hook/synastry-pair/venus/saturn/conjunction",
  "fallback-hook/synastry-pair/venus/saturn/hard",
  "fallback-hook/synastry-pair/venus/saturn/soft",
  "fallback-hook/synastry-pair/venus/uranus/conjunction",
  "fallback-hook/synastry-pair/venus/uranus/hard",
  "fallback-hook/synastry-pair/venus/uranus/soft"
]);

export const MIXED_ARROW_OVERRIDES = new Map(Object.entries({
  "fallback-hook/synastry-pair/mercury/neptune/conjunction": {
    existingSemanticDirection: "mixed_mercury_neptune",
    missingSemanticDirection: "neptune_to_mercury"
  },
  "fallback-hook/synastry-pair/mercury/neptune/soft": {
    existingSemanticDirection: "mixed_neptune_mercury",
    missingSemanticDirection: "mercury_to_neptune"
  }
}));

function parseKey(contentKey) {
  const parts = String(contentKey ?? "").split("/");
  if (parts.length !== 5 || parts[0] !== "fallback-hook" || parts[1] !== "synastry-pair") {
    throw new Error(`Not a synastry pair content key: ${contentKey}`);
  }
  const [, , planet1, planet2, aspectFamily] = parts;
  return { planet1, planet2, aspectFamily, pairKey: `${planet1}/${planet2}` };
}

export function classifySynastryDirectionality(contentKey) {
  const { planet1, planet2, pairKey } = parseKey(contentKey);

  let action = DIRECTIONALITY_ACTION.AUTHOR_REVERSE;
  if (RECIPROCAL_ALL_ASPECT_PAIRS.has(pairKey)) {
    action = DIRECTIONALITY_ACTION.RECIPROCAL_NO_REVERSE;
  } else if (NEEDS_REVIEW_ALL_ASPECT_PAIRS.has(pairKey)) {
    action = DIRECTIONALITY_ACTION.NEEDS_DIRECTION_REVIEW;
  }
  action = ACTION_OVERRIDES_BY_CONTENT_KEY.get(contentKey) ?? action;

  if (action !== DIRECTIONALITY_ACTION.AUTHOR_REVERSE) {
    return {
      action,
      existingSemanticDirection: action === DIRECTIONALITY_ACTION.RECIPROCAL_NO_REVERSE
        ? "shared_reciprocal"
        : "mixed_needs_review",
      missingSemanticDirection: null
    };
  }

  const mixed = MIXED_ARROW_OVERRIDES.get(contentKey);
  if (mixed) return { action, ...mixed };

  const reversed = REVERSED_EXISTING_ARROW_KEYS.has(contentKey);
  return {
    action,
    existingSemanticDirection: reversed
      ? `${planet2}_to_${planet1}`
      : `${planet1}_to_${planet2}`,
    missingSemanticDirection: reversed
      ? `${planet1}_to_${planet2}`
      : `${planet2}_to_${planet1}`
  };
}

export const HUMAN_REVIEW_EXPECTED_COUNTS = Object.freeze({
  servingRows: 483,
  canonicalPairs: 161,
  actions: Object.freeze({
    AUTHOR_REVERSE: 397,
    RECIPROCAL_NO_REVERSE: 76,
    NEEDS_DIRECTION_REVIEW: 10
  })
});
