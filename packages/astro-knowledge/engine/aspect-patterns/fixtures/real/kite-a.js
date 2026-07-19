"use strict";

module.exports = {
  "label": "Real calculated chart: Kite",
  "input": {
    "planets": [
      {
        "id": "sun",
        "longitude": 319.318,
        "sign": "aquarius"
      },
      {
        "id": "moon",
        "longitude": 196.7403,
        "sign": "libra"
      },
      {
        "id": "mercury",
        "longitude": 332.2913,
        "sign": "pisces"
      },
      {
        "id": "venus",
        "longitude": 299.0073,
        "sign": "capricorn"
      },
      {
        "id": "mars",
        "longitude": 158.0131,
        "sign": "virgo"
      },
      {
        "id": "jupiter",
        "longitude": 274.1648,
        "sign": "capricorn"
      },
      {
        "id": "saturn",
        "longitude": 282.0568,
        "sign": "capricorn"
      },
      {
        "id": "uranus",
        "longitude": 256.1432,
        "sign": "sagittarius"
      },
      {
        "id": "neptune",
        "longitude": 86.6525,
        "sign": "gemini"
      },
      {
        "id": "pluto",
        "longitude": 75.7586,
        "sign": "gemini"
      }
    ],
    "aspects": [
      {
        "id": "snapshot.aspect.jupiter.sextile.mercury",
        "pointA": "jupiter",
        "pointB": "mercury",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 58.1265,
        "orb": 1.9,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.trine.mars",
        "pointA": "jupiter",
        "pointB": "mars",
        "type": "trine",
        "exactAngle": 120,
        "separation": 116.1517,
        "orb": 3.8,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.trine.saturn",
        "pointA": "mars",
        "pointB": "saturn",
        "type": "trine",
        "exactAngle": 120,
        "separation": 124.0437,
        "orb": 4,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.sextile.uranus",
        "pointA": "moon",
        "pointB": "uranus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 59.4029,
        "orb": 0.6,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.square.saturn",
        "pointA": "moon",
        "pointB": "saturn",
        "type": "square",
        "exactAngle": 90,
        "separation": 85.3165,
        "orb": 4.7,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.trine.pluto",
        "pointA": "moon",
        "pointB": "pluto",
        "type": "trine",
        "exactAngle": 120,
        "separation": 120.9817,
        "orb": 1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.trine.sun",
        "pointA": "moon",
        "pointB": "sun",
        "type": "trine",
        "exactAngle": 120,
        "separation": 122.5777,
        "orb": 2.6,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.neptune.quincunx.venus",
        "pointA": "neptune",
        "pointB": "venus",
        "type": "quincunx",
        "exactAngle": 150,
        "separation": 147.6452,
        "orb": 2.4,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.opposition.uranus",
        "pointA": "pluto",
        "pointB": "uranus",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 179.6154,
        "orb": 0.4,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.trine.sun",
        "pointA": "pluto",
        "pointB": "sun",
        "type": "trine",
        "exactAngle": 120,
        "separation": 116.4406,
        "orb": 3.6,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.sun.sextile.uranus",
        "pointA": "sun",
        "pointB": "uranus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 63.1748,
        "orb": 3.2,
        "applying": false,
        "outOfSign": false
      }
    ],
    "angles": {
      "ascendantSign": "aries",
      "ascendantLongitude": 0,
      "midheavenLongitude": 270
    }
  },
  "expected": {
    "patternIds": [
      "aspect-pattern:grand_trine:sun-moon-pluto",
      "aspect-pattern:kite:sun-moon-pluto:focal-uranus"
    ],
    "patternTypes": [
      {
        "id": "aspect-pattern:grand_trine:sun-moon-pluto",
        "type": "grand_trine"
      },
      {
        "id": "aspect-pattern:kite:sun-moon-pluto:focal-uranus",
        "type": "kite"
      }
    ],
    "members": {
      "aspect-pattern:grand_trine:sun-moon-pluto": [
        "sun",
        "moon",
        "pluto"
      ],
      "aspect-pattern:kite:sun-moon-pluto:focal-uranus": [
        "sun",
        "moon",
        "uranus",
        "pluto"
      ]
    },
    "sourceAspectIds": {
      "aspect-pattern:grand_trine:sun-moon-pluto": [
        "snapshot.aspect.moon.trine.pluto",
        "snapshot.aspect.moon.trine.sun",
        "snapshot.aspect.pluto.trine.sun"
      ],
      "aspect-pattern:kite:sun-moon-pluto:focal-uranus": [
        "snapshot.aspect.moon.sextile.uranus",
        "snapshot.aspect.moon.trine.pluto",
        "snapshot.aspect.moon.trine.sun",
        "snapshot.aspect.pluto.opposition.uranus",
        "snapshot.aspect.pluto.trine.sun",
        "snapshot.aspect.sun.sextile.uranus"
      ]
    },
    "roles": {
      "aspect-pattern:grand_trine:sun-moon-pluto": {
        "type": "grand_trine",
        "planets": [
          "sun",
          "moon",
          "pluto"
        ],
        "elementConsistency": "same_element"
      },
      "aspect-pattern:kite:sun-moon-pluto:focal-uranus": {
        "type": "kite",
        "grandTrinePlanets": [
          "sun",
          "moon",
          "pluto"
        ],
        "focalPlanet": "uranus",
        "opposedTrinePlanet": "pluto",
        "spine": [
          "uranus",
          "pluto"
        ],
        "resourcePlanets": [
          "sun",
          "moon"
        ]
      }
    },
    "derivedPoints": {
      "aspect-pattern:grand_trine:sun-moon-pluto": [],
      "aspect-pattern:kite:sun-moon-pluto:focal-uranus": []
    },
    "confidence": {
      "aspect-pattern:grand_trine:sun-moon-pluto": "strong",
      "aspect-pattern:kite:sun-moon-pluto:focal-uranus": "strong"
    },
    "warnings": {
      "diagnostics": [],
      "byPattern": {
        "aspect-pattern:grand_trine:sun-moon-pluto": [],
        "aspect-pattern:kite:sun-moon-pluto:focal-uranus": []
      }
    },
    "relationships": [
      {
        "parentPatternId": "aspect-pattern:grand_trine:sun-moon-pluto",
        "childPatternId": "aspect-pattern:kite:sun-moon-pluto:focal-uranus",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_trine:sun-moon-pluto",
        "childPatternId": "aspect-pattern:kite:sun-moon-pluto:focal-uranus",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:kite:sun-moon-pluto:focal-uranus",
        "childPatternId": "aspect-pattern:grand_trine:sun-moon-pluto",
        "relationship": "completes"
      },
      {
        "parentPatternId": "aspect-pattern:kite:sun-moon-pluto:focal-uranus",
        "childPatternId": "aspect-pattern:grand_trine:sun-moon-pluto",
        "relationship": "contains"
      }
    ],
    "rankingRecords": [
      {
        "patternId": "aspect-pattern:kite:sun-moon-pluto:focal-uranus",
        "score": {
          "geometry": 28.4,
          "natalProminence": 22,
          "structuralContext": 12,
          "baseDisplayPriority": 62.4
        },
        "reasons": [
          {
            "code": "contains_moon",
            "planet": "moon",
            "value": 8
          },
          {
            "code": "contains_sun",
            "planet": "sun",
            "value": 8
          },
          {
            "code": "parent_pattern",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "moon",
            "value": 2
          },
          {
            "code": "repeated_planet",
            "planet": "pluto",
            "value": 2
          },
          {
            "code": "repeated_planet",
            "planet": "sun",
            "value": 2
          },
          {
            "code": "tight_geometry",
            "value": 28.4
          }
        ]
      },
      {
        "patternId": "aspect-pattern:grand_trine:sun-moon-pluto",
        "score": {
          "geometry": 28.4,
          "natalProminence": 22,
          "structuralContext": -4,
          "baseDisplayPriority": 46.4
        },
        "reasons": [
          {
            "code": "contained_pattern",
            "value": -4
          },
          {
            "code": "contains_moon",
            "planet": "moon",
            "value": 8
          },
          {
            "code": "contains_sun",
            "planet": "sun",
            "value": 8
          },
          {
            "code": "repeated_planet",
            "planet": "moon",
            "value": 2
          },
          {
            "code": "repeated_planet",
            "planet": "pluto",
            "value": 2
          },
          {
            "code": "repeated_planet",
            "planet": "sun",
            "value": 2
          },
          {
            "code": "tight_geometry",
            "value": 28.4
          }
        ]
      }
    ],
    "displayOrder": [
      "aspect-pattern:kite:sun-moon-pluto:focal-uranus",
      "aspect-pattern:grand_trine:sun-moon-pluto"
    ],
    "diagnostics": {
      "inputPlanetCount": 10,
      "inputAspectCount": 11,
      "eligibleAspectCount": 11,
      "skippedAspects": [],
      "warnings": []
    }
  },
  "validation": {
    "approved": true,
    "issueClassifications": [],
    "notes": []
  }
};
