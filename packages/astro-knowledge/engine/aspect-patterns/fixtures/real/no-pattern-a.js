"use strict";

module.exports = {
  "label": "Real calculated chart: no canonical pattern",
  "input": {
    "planets": [
      {
        "id": "sun",
        "longitude": 280.1534,
        "sign": "capricorn"
      },
      {
        "id": "moon",
        "longitude": 272.4163,
        "sign": "capricorn"
      },
      {
        "id": "mercury",
        "longitude": 258.9978,
        "sign": "sagittarius"
      },
      {
        "id": "venus",
        "longitude": 306.3744,
        "sign": "aquarius"
      },
      {
        "id": "mars",
        "longitude": 283.8677,
        "sign": "capricorn"
      },
      {
        "id": "jupiter",
        "longitude": 241.1359,
        "sign": "sagittarius"
      },
      {
        "id": "saturn",
        "longitude": 267.7168,
        "sign": "sagittarius"
      },
      {
        "id": "uranus",
        "longitude": 250.1393,
        "sign": "sagittarius"
      },
      {
        "id": "neptune",
        "longitude": 85.2187,
        "sign": "gemini"
      },
      {
        "id": "pluto",
        "longitude": 75.2515,
        "sign": "gemini"
      }
    ],
    "aspects": [
      {
        "id": "snapshot.aspect.mars.quincunx.pluto",
        "pointA": "mars",
        "pointB": "pluto",
        "type": "quincunx",
        "exactAngle": 150,
        "separation": 151.3838,
        "orb": 1.4,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mercury.opposition.pluto",
        "pointA": "mercury",
        "pointB": "pluto",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 176.2537,
        "orb": 3.7,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.neptune.opposition.saturn",
        "pointA": "neptune",
        "pointB": "saturn",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 177.5019,
        "orb": 2.5,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.uranus.sextile.venus",
        "pointA": "uranus",
        "pointB": "venus",
        "type": "sextile",
        "exactAngle": 60,
        "separation": 56.2351,
        "orb": 3.8,
        "applying": false,
        "outOfSign": false
      }
    ]
  },
  "expected": {
    "patternIds": [],
    "patternTypes": [],
    "members": {},
    "sourceAspectIds": {},
    "roles": {},
    "derivedPoints": {},
    "confidence": {},
    "warnings": {
      "diagnostics": [],
      "byPattern": {}
    },
    "relationships": [],
    "rankingRecords": [],
    "displayOrder": [],
    "diagnostics": {
      "inputPlanetCount": 10,
      "inputAspectCount": 4,
      "eligibleAspectCount": 4,
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
