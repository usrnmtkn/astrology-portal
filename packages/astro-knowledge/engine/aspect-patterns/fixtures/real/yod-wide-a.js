"use strict";

module.exports = {
  "label": "Real calculated chart: wide Yod",
  "input": {
    "planets": [
      {
        "id": "sun",
        "longitude": 17.9542,
        "sign": "aries"
      },
      {
        "id": "moon",
        "longitude": 123.4379,
        "sign": "leo"
      },
      {
        "id": "mercury",
        "longitude": 356.5378,
        "sign": "pisces"
      },
      {
        "id": "venus",
        "longitude": 62.2596,
        "sign": "gemini"
      },
      {
        "id": "mars",
        "longitude": 0.0657,
        "sign": "aries"
      },
      {
        "id": "jupiter",
        "longitude": 250.6671,
        "sign": "sagittarius"
      },
      {
        "id": "saturn",
        "longitude": 275.0076,
        "sign": "capricorn"
      },
      {
        "id": "uranus",
        "longitude": 252.2854,
        "sign": "sagittarius"
      },
      {
        "id": "neptune",
        "longitude": 84.5251,
        "sign": "gemini"
      },
      {
        "id": "pluto",
        "longitude": 74.9778,
        "sign": "gemini"
      }
    ],
    "aspects": [
      {
        "id": "snapshot.aspect.jupiter.opposition.pluto",
        "pointA": "jupiter",
        "pointB": "pluto",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 175.6893,
        "orb": 4.3,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.sextile.venus",
        "pointA": "mars",
        "pointB": "venus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 62.1939,
        "orb": 2.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.square.saturn",
        "pointA": "mars",
        "pointB": "saturn",
        "type": "square",
        "exactAngle": 90,
        "separation": 85.0581,
        "orb": 4.9,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.trine.moon",
        "pointA": "mars",
        "pointB": "moon",
        "type": "trine",
        "exactAngle": 120,
        "separation": 123.3722,
        "orb": 3.4,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mercury.square.neptune",
        "pointA": "mercury",
        "pointB": "neptune",
        "type": "square",
        "exactAngle": 90,
        "separation": 87.9873,
        "orb": 2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.quincunx.saturn",
        "pointA": "moon",
        "pointB": "saturn",
        "type": "quincunx",
        "exactAngle": 150,
        "separation": 151.5697,
        "orb": 1.6,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.sextile.venus",
        "pointA": "moon",
        "pointB": "venus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 61.1783,
        "orb": 1.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.opposition.uranus",
        "pointA": "pluto",
        "pointB": "uranus",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 177.3076,
        "orb": 2.7,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.sextile.sun",
        "pointA": "pluto",
        "pointB": "sun",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 57.0236,
        "orb": 3,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.saturn.quincunx.venus",
        "pointA": "saturn",
        "pointB": "venus",
        "type": "quincunx",
        "exactAngle": 150,
        "separation": 147.252,
        "orb": 2.7,
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
      "aspect-pattern:yod:moon-venus:apex-saturn"
    ],
    "patternTypes": [
      {
        "id": "aspect-pattern:yod:moon-venus:apex-saturn",
        "type": "yod"
      }
    ],
    "members": {
      "aspect-pattern:yod:moon-venus:apex-saturn": [
        "moon",
        "venus",
        "saturn"
      ]
    },
    "sourceAspectIds": {
      "aspect-pattern:yod:moon-venus:apex-saturn": [
        "snapshot.aspect.moon.quincunx.saturn",
        "snapshot.aspect.moon.sextile.venus",
        "snapshot.aspect.saturn.quincunx.venus"
      ]
    },
    "roles": {
      "aspect-pattern:yod:moon-venus:apex-saturn": {
        "type": "yod",
        "basePlanets": [
          "moon",
          "venus"
        ],
        "apex": "saturn",
        "falloutPoint": {
          "longitude": 95.0076,
          "sign": "cancer"
        }
      }
    },
    "derivedPoints": {
      "aspect-pattern:yod:moon-venus:apex-saturn": [
        {
          "type": "fallout_point",
          "longitude": 95.0076,
          "sign": "cancer"
        },
        {
          "type": "opposite_apex",
          "longitude": 95.0076,
          "sign": "cancer"
        }
      ]
    },
    "confidence": {
      "aspect-pattern:yod:moon-venus:apex-saturn": "wide"
    },
    "warnings": {
      "diagnostics": [
        "wide_orb_pattern"
      ],
      "byPattern": {
        "aspect-pattern:yod:moon-venus:apex-saturn": [
          "wide_orb_pattern"
        ]
      }
    },
    "relationships": [],
    "rankingRecords": [
      {
        "patternId": "aspect-pattern:yod:moon-venus:apex-saturn",
        "score": {
          "geometry": 19.3,
          "natalProminence": 12,
          "structuralContext": 0,
          "baseDisplayPriority": 31.3
        },
        "reasons": [
          {
            "code": "contains_moon",
            "planet": "moon",
            "value": 8
          },
          {
            "code": "contains_personal_planet",
            "planet": "venus",
            "value": 4
          },
          {
            "code": "tight_geometry",
            "value": 19.3
          }
        ]
      }
    ],
    "displayOrder": [
      "aspect-pattern:yod:moon-venus:apex-saturn"
    ],
    "diagnostics": {
      "inputPlanetCount": 10,
      "inputAspectCount": 10,
      "eligibleAspectCount": 10,
      "skippedAspects": [],
      "warnings": [
        "wide_orb_pattern"
      ]
    }
  },
  "validation": {
    "approved": true,
    "issueClassifications": [],
    "notes": [
      "ORB_POLICY_ISSUE: wide Yod is valid under current policy and flagged for review."
    ]
  }
};
