"use strict";

module.exports = {
  "label": "Real calculated chart: isolated T-square",
  "input": {
    "planets": [
      {
        "id": "sun",
        "longitude": 311.7087,
        "sign": "aquarius"
      },
      {
        "id": "moon",
        "longitude": 325.0607,
        "sign": "aquarius"
      },
      {
        "id": "mercury",
        "longitude": 305.4145,
        "sign": "aquarius"
      },
      {
        "id": "venus",
        "longitude": 344.6667,
        "sign": "pisces"
      },
      {
        "id": "mars",
        "longitude": 308.0028,
        "sign": "aquarius"
      },
      {
        "id": "jupiter",
        "longitude": 246.5205,
        "sign": "sagittarius"
      },
      {
        "id": "saturn",
        "longitude": 271.0993,
        "sign": "capricorn"
      },
      {
        "id": "uranus",
        "longitude": 251.6081,
        "sign": "sagittarius"
      },
      {
        "id": "neptune",
        "longitude": 84.5047,
        "sign": "gemini"
      },
      {
        "id": "pluto",
        "longitude": 74.8243,
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
        "separation": 61.4823,
        "orb": 1.5,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.sextile.mercury",
        "pointA": "jupiter",
        "pointB": "mercury",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 58.894,
        "orb": 1.1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.sextile.uranus",
        "pointA": "mars",
        "pointB": "uranus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 56.3947,
        "orb": 3.6,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.trine.neptune",
        "pointA": "moon",
        "pointB": "neptune",
        "type": "trine",
        "exactAngle": 120,
        "separation": 119.444,
        "orb": 0.6,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.opposition.uranus",
        "pointA": "pluto",
        "pointB": "uranus",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 176.7838,
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
        "separation": 90.1576,
        "orb": 0.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.trine.sun",
        "pointA": "pluto",
        "pointB": "sun",
        "type": "trine",
        "exactAngle": 120,
        "separation": 123.1156,
        "orb": 3.1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.sun.sextile.uranus",
        "pointA": "sun",
        "pointB": "uranus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 60.1006,
        "orb": 0.1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.uranus.square.venus",
        "pointA": "uranus",
        "pointB": "venus",
        "type": "square",
        "exactAngle": 90,
        "separation": 93.0586,
        "orb": 3.1,
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
          "longitude": 164.6667,
          "sign": "virgo"
        }
      }
    },
    "derivedPoints": {
      "aspect-pattern:t_square:uranus-pluto:apex-venus": [
        {
          "type": "empty_leg",
          "longitude": 164.6667,
          "sign": "virgo"
        },
        {
          "type": "opposite_apex",
          "longitude": 164.6667,
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
          "geometry": 28.8,
          "natalProminence": 4,
          "structuralContext": 0,
          "baseDisplayPriority": 32.8
        },
        "reasons": [
          {
            "code": "contains_personal_planet",
            "planet": "venus",
            "value": 4
          },
          {
            "code": "tight_geometry",
            "value": 28.8
          }
        ]
      }
    ],
    "displayOrder": [
      "aspect-pattern:t_square:uranus-pluto:apex-venus"
    ],
    "diagnostics": {
      "inputPlanetCount": 10,
      "inputAspectCount": 9,
      "eligibleAspectCount": 9,
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
