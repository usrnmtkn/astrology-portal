"use strict";

module.exports = {
  "label": "Real calculated chart: Grand Trine ambiguity",
  "input": {
    "planets": [
      {
        "id": "sun",
        "longitude": 194.2503,
        "sign": "libra"
      },
      {
        "id": "moon",
        "longitude": 6.3134,
        "sign": "aries"
      },
      {
        "id": "mercury",
        "longitude": 210.9763,
        "sign": "scorpio"
      },
      {
        "id": "venus",
        "longitude": 149.3811,
        "sign": "leo"
      },
      {
        "id": "mars",
        "longitude": 126.5287,
        "sign": "leo"
      },
      {
        "id": "jupiter",
        "longitude": 247.8372,
        "sign": "sagittarius"
      },
      {
        "id": "saturn",
        "longitude": 269.4319,
        "sign": "sagittarius"
      },
      {
        "id": "uranus",
        "longitude": 249.545,
        "sign": "sagittarius"
      },
      {
        "id": "neptune",
        "longitude": 89.254,
        "sign": "gemini"
      },
      {
        "id": "pluto",
        "longitude": 77.6253,
        "sign": "gemini"
      }
    ],
    "aspects": [
      {
        "id": "snapshot.aspect.jupiter.trine.mars",
        "pointA": "jupiter",
        "pointB": "mars",
        "type": "trine",
        "exactAngle": 120,
        "separation": 121.3085,
        "orb": 1.3,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.trine.moon",
        "pointA": "jupiter",
        "pointB": "moon",
        "type": "trine",
        "exactAngle": 120,
        "separation": 118.4762,
        "orb": 1.5,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.trine.moon",
        "pointA": "mars",
        "pointB": "moon",
        "type": "trine",
        "exactAngle": 120,
        "separation": 120.2153,
        "orb": 0.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.trine.uranus",
        "pointA": "mars",
        "pointB": "uranus",
        "type": "trine",
        "exactAngle": 120,
        "separation": 123.0163,
        "orb": 3,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mercury.sextile.saturn",
        "pointA": "mercury",
        "pointB": "saturn",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 58.4556,
        "orb": 1.5,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mercury.sextile.venus",
        "pointA": "mercury",
        "pointB": "venus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 61.5952,
        "orb": 1.6,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mercury.trine.neptune",
        "pointA": "mercury",
        "pointB": "neptune",
        "type": "trine",
        "exactAngle": 120,
        "separation": 121.7223,
        "orb": 1.7,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.trine.uranus",
        "pointA": "moon",
        "pointB": "uranus",
        "type": "trine",
        "exactAngle": 120,
        "separation": 116.7684,
        "orb": 3.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.neptune.opposition.saturn",
        "pointA": "neptune",
        "pointB": "saturn",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 179.8221,
        "orb": 0.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.neptune.sextile.venus",
        "pointA": "neptune",
        "pointB": "venus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 60.1271,
        "orb": 0.1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.trine.sun",
        "pointA": "pluto",
        "pointB": "sun",
        "type": "trine",
        "exactAngle": 120,
        "separation": 116.625,
        "orb": 3.4,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.saturn.trine.venus",
        "pointA": "saturn",
        "pointB": "venus",
        "type": "trine",
        "exactAngle": 120,
        "separation": 120.0508,
        "orb": 0.1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.sun.sextile.uranus",
        "pointA": "sun",
        "pointB": "uranus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 55.2947,
        "orb": 4.7,
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
      "aspect-pattern:grand_trine:moon-mars-jupiter",
      "aspect-pattern:grand_trine:moon-mars-uranus"
    ],
    "patternTypes": [
      {
        "id": "aspect-pattern:grand_trine:moon-mars-jupiter",
        "type": "grand_trine"
      },
      {
        "id": "aspect-pattern:grand_trine:moon-mars-uranus",
        "type": "grand_trine"
      }
    ],
    "members": {
      "aspect-pattern:grand_trine:moon-mars-jupiter": [
        "moon",
        "mars",
        "jupiter"
      ],
      "aspect-pattern:grand_trine:moon-mars-uranus": [
        "moon",
        "mars",
        "uranus"
      ]
    },
    "sourceAspectIds": {
      "aspect-pattern:grand_trine:moon-mars-jupiter": [
        "snapshot.aspect.jupiter.trine.mars",
        "snapshot.aspect.jupiter.trine.moon",
        "snapshot.aspect.mars.trine.moon"
      ],
      "aspect-pattern:grand_trine:moon-mars-uranus": [
        "snapshot.aspect.mars.trine.moon",
        "snapshot.aspect.mars.trine.uranus",
        "snapshot.aspect.moon.trine.uranus"
      ]
    },
    "roles": {
      "aspect-pattern:grand_trine:moon-mars-jupiter": {
        "type": "grand_trine",
        "planets": [
          "moon",
          "mars",
          "jupiter"
        ],
        "elementConsistency": "same_element"
      },
      "aspect-pattern:grand_trine:moon-mars-uranus": {
        "type": "grand_trine",
        "planets": [
          "moon",
          "mars",
          "uranus"
        ],
        "elementConsistency": "same_element"
      }
    },
    "derivedPoints": {
      "aspect-pattern:grand_trine:moon-mars-jupiter": [],
      "aspect-pattern:grand_trine:moon-mars-uranus": []
    },
    "confidence": {
      "aspect-pattern:grand_trine:moon-mars-jupiter": "exact",
      "aspect-pattern:grand_trine:moon-mars-uranus": "strong"
    },
    "warnings": {
      "diagnostics": [],
      "byPattern": {
        "aspect-pattern:grand_trine:moon-mars-jupiter": [],
        "aspect-pattern:grand_trine:moon-mars-uranus": []
      }
    },
    "relationships": [
      {
        "parentPatternId": "aspect-pattern:grand_trine:moon-mars-jupiter",
        "childPatternId": "aspect-pattern:grand_trine:moon-mars-uranus",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_trine:moon-mars-jupiter",
        "childPatternId": "aspect-pattern:grand_trine:moon-mars-uranus",
        "relationship": "shares_planet"
      }
    ],
    "rankingRecords": [
      {
        "patternId": "aspect-pattern:grand_trine:moon-mars-jupiter",
        "score": {
          "geometry": 38.5,
          "natalProminence": 23,
          "structuralContext": 0,
          "baseDisplayPriority": 61.5
        },
        "reasons": [
          {
            "code": "contains_chart_ruler",
            "planet": "mars",
            "value": 7
          },
          {
            "code": "contains_moon",
            "planet": "moon",
            "value": 8
          },
          {
            "code": "contains_personal_planet",
            "planet": "mars",
            "value": 4
          },
          {
            "code": "repeated_planet",
            "planet": "mars",
            "value": 2
          },
          {
            "code": "repeated_planet",
            "planet": "moon",
            "value": 2
          },
          {
            "code": "tight_geometry",
            "value": 38.5
          }
        ]
      },
      {
        "patternId": "aspect-pattern:grand_trine:moon-mars-uranus",
        "score": {
          "geometry": 28.8,
          "natalProminence": 23,
          "structuralContext": 0,
          "baseDisplayPriority": 51.8
        },
        "reasons": [
          {
            "code": "contains_chart_ruler",
            "planet": "mars",
            "value": 7
          },
          {
            "code": "contains_moon",
            "planet": "moon",
            "value": 8
          },
          {
            "code": "contains_personal_planet",
            "planet": "mars",
            "value": 4
          },
          {
            "code": "repeated_planet",
            "planet": "mars",
            "value": 2
          },
          {
            "code": "repeated_planet",
            "planet": "moon",
            "value": 2
          },
          {
            "code": "tight_geometry",
            "value": 28.8
          }
        ]
      }
    ],
    "displayOrder": [
      "aspect-pattern:grand_trine:moon-mars-jupiter",
      "aspect-pattern:grand_trine:moon-mars-uranus"
    ],
    "diagnostics": {
      "inputPlanetCount": 10,
      "inputAspectCount": 13,
      "eligibleAspectCount": 13,
      "skippedAspects": [],
      "warnings": []
    }
  },
  "validation": {
    "approved": true,
    "issueClassifications": [],
    "notes": [
      "EXPECTED_AMBIGUITY: two Grand Trines are mathematically defensible and must remain visible."
    ]
  }
};
