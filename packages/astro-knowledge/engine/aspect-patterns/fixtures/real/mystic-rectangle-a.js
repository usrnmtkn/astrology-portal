"use strict";

module.exports = {
  "label": "Real calculated chart: Mystic Rectangle",
  "input": {
    "planets": [
      {
        "id": "sun",
        "longitude": 104.8898,
        "sign": "cancer"
      },
      {
        "id": "moon",
        "longitude": 138.9443,
        "sign": "leo"
      },
      {
        "id": "mercury",
        "longitude": 87.4963,
        "sign": "gemini"
      },
      {
        "id": "venus",
        "longitude": 69.013,
        "sign": "gemini"
      },
      {
        "id": "mars",
        "longitude": 81.3423,
        "sign": "gemini"
      },
      {
        "id": "jupiter",
        "longitude": 315.7009,
        "sign": "aquarius"
      },
      {
        "id": "saturn",
        "longitude": 295.2261,
        "sign": "capricorn"
      },
      {
        "id": "uranus",
        "longitude": 258.2458,
        "sign": "sagittarius"
      },
      {
        "id": "neptune",
        "longitude": 91.7161,
        "sign": "cancer"
      },
      {
        "id": "pluto",
        "longitude": 78.8032,
        "sign": "gemini"
      }
    ],
    "aspects": [
      {
        "id": "snapshot.aspect.jupiter.opposition.moon",
        "pointA": "jupiter",
        "pointB": "moon",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 176.7566,
        "orb": 3.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.quincunx.sun",
        "pointA": "jupiter",
        "pointB": "sun",
        "type": "quincunx",
        "exactAngle": 150,
        "separation": 149.1889,
        "orb": 0.8,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.sextile.uranus",
        "pointA": "jupiter",
        "pointB": "uranus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 57.4551,
        "orb": 2.5,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.trine.pluto",
        "pointA": "jupiter",
        "pointB": "pluto",
        "type": "trine",
        "exactAngle": 120,
        "separation": 123.1023,
        "orb": 3.1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.opposition.uranus",
        "pointA": "mars",
        "pointB": "uranus",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 176.9035,
        "orb": 3.1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.sextile.moon",
        "pointA": "mars",
        "pointB": "moon",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 57.602,
        "orb": 2.4,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mercury.quincunx.saturn",
        "pointA": "mercury",
        "pointB": "saturn",
        "type": "quincunx",
        "exactAngle": 150,
        "separation": 152.2702,
        "orb": 2.3,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.sextile.pluto",
        "pointA": "moon",
        "pointB": "pluto",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 60.1411,
        "orb": 0.1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.trine.uranus",
        "pointA": "moon",
        "pointB": "uranus",
        "type": "trine",
        "exactAngle": 120,
        "separation": 119.3015,
        "orb": 0.7,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.opposition.uranus",
        "pointA": "pluto",
        "pointB": "uranus",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 179.4426,
        "orb": 0.6,
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
      "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto"
    ],
    "patternTypes": [
      {
        "id": "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto",
        "type": "mystic_rectangle"
      }
    ],
    "members": {
      "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto": [
        "moon",
        "jupiter",
        "uranus",
        "pluto"
      ]
    },
    "sourceAspectIds": {
      "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto": [
        "snapshot.aspect.jupiter.opposition.moon",
        "snapshot.aspect.jupiter.sextile.uranus",
        "snapshot.aspect.jupiter.trine.pluto",
        "snapshot.aspect.moon.sextile.pluto",
        "snapshot.aspect.moon.trine.uranus",
        "snapshot.aspect.pluto.opposition.uranus"
      ]
    },
    "roles": {
      "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto": {
        "type": "mystic_rectangle",
        "oppositionAxes": [
          [
            "moon",
            "jupiter"
          ],
          [
            "uranus",
            "pluto"
          ]
        ],
        "supportiveAspects": [
          {
            "id": "snapshot.aspect.jupiter.sextile.uranus",
            "pointA": "jupiter",
            "pointB": "uranus",
            "type": "sextile",
            "exactAngle": 60,
            "orb": 2.5,
            "applying": false,
            "outOfSign": false
          },
          {
            "id": "snapshot.aspect.jupiter.trine.pluto",
            "pointA": "jupiter",
            "pointB": "pluto",
            "type": "trine",
            "exactAngle": 120,
            "orb": 3.1,
            "applying": false,
            "outOfSign": false
          },
          {
            "id": "snapshot.aspect.moon.sextile.pluto",
            "pointA": "moon",
            "pointB": "pluto",
            "type": "sextile",
            "exactAngle": 60,
            "orb": 0.1,
            "applying": false,
            "outOfSign": false
          },
          {
            "id": "snapshot.aspect.moon.trine.uranus",
            "pointA": "moon",
            "pointB": "uranus",
            "type": "trine",
            "exactAngle": 120,
            "orb": 0.7,
            "applying": false,
            "outOfSign": false
          }
        ],
        "variant": "trine_sextile"
      }
    },
    "derivedPoints": {
      "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto": []
    },
    "confidence": {
      "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto": "strong"
    },
    "warnings": {
      "diagnostics": [],
      "byPattern": {
        "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto": []
      }
    },
    "relationships": [],
    "rankingRecords": [
      {
        "patternId": "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto",
        "score": {
          "geometry": 28.8,
          "natalProminence": 8,
          "structuralContext": 0,
          "baseDisplayPriority": 36.8
        },
        "reasons": [
          {
            "code": "contains_moon",
            "planet": "moon",
            "value": 8
          },
          {
            "code": "tight_geometry",
            "value": 28.8
          }
        ]
      }
    ],
    "displayOrder": [
      "aspect-pattern:mystic_rectangle:moon-jupiter_uranus-pluto"
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
    "notes": []
  }
};
