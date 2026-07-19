"use strict";

module.exports = {
  "label": "Real calculated chart: unknown birth time metadata",
  "input": {
    "planets": [
      {
        "id": "sun",
        "longitude": 312.2162,
        "sign": "aquarius"
      },
      {
        "id": "moon",
        "longitude": 332.6649,
        "sign": "pisces"
      },
      {
        "id": "mercury",
        "longitude": 306.2499,
        "sign": "aquarius"
      },
      {
        "id": "venus",
        "longitude": 345.2789,
        "sign": "pisces"
      },
      {
        "id": "mars",
        "longitude": 308.3955,
        "sign": "aquarius"
      },
      {
        "id": "jupiter",
        "longitude": 246.5939,
        "sign": "sagittarius"
      },
      {
        "id": "saturn",
        "longitude": 271.1487,
        "sign": "capricorn"
      },
      {
        "id": "uranus",
        "longitude": 251.6269,
        "sign": "sagittarius"
      },
      {
        "id": "neptune",
        "longitude": 84.4961,
        "sign": "gemini"
      },
      {
        "id": "pluto",
        "longitude": 74.8196,
        "sign": "gemini"
      }
    ],
    "aspects": [
      {
        "id": "snapshot.aspect.jupiter.sextile.mars",
        "pointA": "jupiter",
        "pointB": "mars",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 61.8016,
        "orb": 1.8,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.sextile.mercury",
        "pointA": "jupiter",
        "pointB": "mercury",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 59.656,
        "orb": 0.3,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.square.moon",
        "pointA": "jupiter",
        "pointB": "moon",
        "type": "square",
        "exactAngle": 90,
        "separation": 86.071,
        "orb": 3.9,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.sextile.uranus",
        "pointA": "mars",
        "pointB": "uranus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 56.7686,
        "orb": 3.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.sextile.saturn",
        "pointA": "moon",
        "pointB": "saturn",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 61.5162,
        "orb": 1.5,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.opposition.uranus",
        "pointA": "pluto",
        "pointB": "uranus",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 176.8073,
        "orb": 3.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.square.venus",
        "pointA": "pluto",
        "pointB": "venus",
        "type": "square",
        "exactAngle": 90,
        "separation": 89.5407,
        "orb": 0.5,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.trine.sun",
        "pointA": "pluto",
        "pointB": "sun",
        "type": "trine",
        "exactAngle": 120,
        "separation": 122.6034,
        "orb": 2.6,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.sun.sextile.uranus",
        "pointA": "sun",
        "pointB": "uranus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 60.5893,
        "orb": 0.6,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.uranus.square.venus",
        "pointA": "uranus",
        "pointB": "venus",
        "type": "square",
        "exactAngle": 90,
        "separation": 93.652,
        "orb": 3.7,
        "applying": false,
        "outOfSign": false
      }
    ]
  },
  "expected": {
    "patternIds": [
      "aspect-pattern:t_square:uranus-pluto:apex-venus"
    ],
    "patternTypes": [
      {
        "id": "aspect-pattern:t_square:uranus-pluto:apex-venus",
        "type": "t_square"
      }
    ],
    "members": {
      "aspect-pattern:t_square:uranus-pluto:apex-venus": [
        "venus",
        "uranus",
        "pluto"
      ]
    },
    "sourceAspectIds": {
      "aspect-pattern:t_square:uranus-pluto:apex-venus": [
        "snapshot.aspect.pluto.opposition.uranus",
        "snapshot.aspect.pluto.square.venus",
        "snapshot.aspect.uranus.square.venus"
      ]
    },
    "roles": {
      "aspect-pattern:t_square:uranus-pluto:apex-venus": {
        "type": "t_square",
        "oppositionAxis": [
          "uranus",
          "pluto"
        ],
        "apex": "venus",
        "emptyLeg": {
          "longitude": 165.2789,
          "sign": "virgo"
        }
      }
    },
    "derivedPoints": {
      "aspect-pattern:t_square:uranus-pluto:apex-venus": [
        {
          "type": "empty_leg",
          "longitude": 165.2789,
          "sign": "virgo"
        },
        {
          "type": "opposite_apex",
          "longitude": 165.2789,
          "sign": "virgo"
        }
      ]
    },
    "confidence": {
      "aspect-pattern:t_square:uranus-pluto:apex-venus": "strong"
    },
    "warnings": {
      "diagnostics": [],
      "byPattern": {
        "aspect-pattern:t_square:uranus-pluto:apex-venus": []
      }
    },
    "relationships": [],
    "rankingRecords": [
      {
        "patternId": "aspect-pattern:t_square:uranus-pluto:apex-venus",
        "score": {
          "geometry": 28.3,
          "natalProminence": 4,
          "structuralContext": 0,
          "baseDisplayPriority": 32.3
        },
        "reasons": [
          {
            "code": "contains_personal_planet",
            "planet": "venus",
            "value": 4
          },
          {
            "code": "tight_geometry",
            "value": 28.3
          }
        ]
      }
    ],
    "displayOrder": [
      "aspect-pattern:t_square:uranus-pluto:apex-venus"
    ],
    "diagnostics": {
      "inputPlanetCount": 10,
      "inputAspectCount": 10,
      "eligibleAspectCount": 10,
      "skippedAspects": [],
      "warnings": []
    }
  },
  "validation": {
    "approved": true,
    "issueClassifications": [],
    "notes": [
      "SOURCE_DATA_LIMITATION: no birth-time angle metadata is present; geometry remains valid."
    ]
  }
};
