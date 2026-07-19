"use strict";

module.exports = {
  "label": "Real calculated chart: overlapping Grand Squares and T-squares",
  "input": {
    "planets": [
      {
        "id": "sun",
        "longitude": 354.2175,
        "sign": "pisces"
      },
      {
        "id": "moon",
        "longitude": 162.3265,
        "sign": "virgo"
      },
      {
        "id": "mercury",
        "longitude": 9.1596,
        "sign": "aries"
      },
      {
        "id": "venus",
        "longitude": 35.2344,
        "sign": "taurus"
      },
      {
        "id": "mars",
        "longitude": 341.2831,
        "sign": "pisces"
      },
      {
        "id": "jupiter",
        "longitude": 250.6198,
        "sign": "sagittarius"
      },
      {
        "id": "saturn",
        "longitude": 274.3027,
        "sign": "capricorn"
      },
      {
        "id": "uranus",
        "longitude": 252.4796,
        "sign": "sagittarius"
      },
      {
        "id": "neptune",
        "longitude": 84.2363,
        "sign": "gemini"
      },
      {
        "id": "pluto",
        "longitude": 74.741,
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
        "separation": 175.8788,
        "orb": 4.1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.square.mars",
        "pointA": "jupiter",
        "pointB": "mars",
        "type": "square",
        "exactAngle": 90,
        "separation": 90.6633,
        "orb": 0.7,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.square.moon",
        "pointA": "jupiter",
        "pointB": "moon",
        "type": "square",
        "exactAngle": 90,
        "separation": 88.2933,
        "orb": 1.7,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.jupiter.trine.mercury",
        "pointA": "jupiter",
        "pointB": "mercury",
        "type": "trine",
        "exactAngle": 120,
        "separation": 118.5398,
        "orb": 1.5,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.opposition.moon",
        "pointA": "mars",
        "pointB": "moon",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 178.9566,
        "orb": 1,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.square.pluto",
        "pointA": "mars",
        "pointB": "pluto",
        "type": "square",
        "exactAngle": 90,
        "separation": 93.4579,
        "orb": 3.5,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mars.square.uranus",
        "pointA": "mars",
        "pointB": "uranus",
        "type": "square",
        "exactAngle": 90,
        "separation": 88.8035,
        "orb": 1.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mercury.square.saturn",
        "pointA": "mercury",
        "pointB": "saturn",
        "type": "square",
        "exactAngle": 90,
        "separation": 94.8569,
        "orb": 4.9,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.mercury.trine.uranus",
        "pointA": "mercury",
        "pointB": "uranus",
        "type": "trine",
        "exactAngle": 120,
        "separation": 116.68,
        "orb": 3.3,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.square.pluto",
        "pointA": "moon",
        "pointB": "pluto",
        "type": "square",
        "exactAngle": 90,
        "separation": 87.5855,
        "orb": 2.4,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.moon.square.uranus",
        "pointA": "moon",
        "pointB": "uranus",
        "type": "square",
        "exactAngle": 90,
        "separation": 90.1531,
        "orb": 0.2,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.neptune.square.sun",
        "pointA": "neptune",
        "pointB": "sun",
        "type": "square",
        "exactAngle": 90,
        "separation": 90.0188,
        "orb": 0,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.pluto.opposition.uranus",
        "pointA": "pluto",
        "pointB": "uranus",
        "type": "opposition",
        "exactAngle": 180,
        "separation": 177.7386,
        "orb": 2.3,
        "applying": false,
        "outOfSign": false
      },
      {
        "id": "snapshot.aspect.saturn.trine.venus",
        "pointA": "saturn",
        "pointB": "venus",
        "type": "trine",
        "exactAngle": 120,
        "separation": 120.9317,
        "orb": 0.9,
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
      "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
      "aspect-pattern:grand_square:moon-mars-uranus-pluto",
      "aspect-pattern:t_square:jupiter-pluto:apex-mars",
      "aspect-pattern:t_square:jupiter-pluto:apex-moon",
      "aspect-pattern:t_square:moon-mars:apex-jupiter",
      "aspect-pattern:t_square:moon-mars:apex-pluto",
      "aspect-pattern:t_square:moon-mars:apex-uranus",
      "aspect-pattern:t_square:uranus-pluto:apex-mars",
      "aspect-pattern:t_square:uranus-pluto:apex-moon"
    ],
    "patternTypes": [
      {
        "id": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "type": "grand_square"
      },
      {
        "id": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "type": "grand_square"
      },
      {
        "id": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "type": "t_square"
      },
      {
        "id": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "type": "t_square"
      },
      {
        "id": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "type": "t_square"
      },
      {
        "id": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "type": "t_square"
      },
      {
        "id": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "type": "t_square"
      },
      {
        "id": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "type": "t_square"
      },
      {
        "id": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "type": "t_square"
      }
    ],
    "members": {
      "aspect-pattern:grand_square:moon-mars-jupiter-pluto": [
        "moon",
        "mars",
        "jupiter",
        "pluto"
      ],
      "aspect-pattern:grand_square:moon-mars-uranus-pluto": [
        "moon",
        "mars",
        "uranus",
        "pluto"
      ],
      "aspect-pattern:t_square:jupiter-pluto:apex-mars": [
        "mars",
        "jupiter",
        "pluto"
      ],
      "aspect-pattern:t_square:jupiter-pluto:apex-moon": [
        "moon",
        "jupiter",
        "pluto"
      ],
      "aspect-pattern:t_square:moon-mars:apex-jupiter": [
        "moon",
        "mars",
        "jupiter"
      ],
      "aspect-pattern:t_square:moon-mars:apex-pluto": [
        "moon",
        "mars",
        "pluto"
      ],
      "aspect-pattern:t_square:moon-mars:apex-uranus": [
        "moon",
        "mars",
        "uranus"
      ],
      "aspect-pattern:t_square:uranus-pluto:apex-mars": [
        "mars",
        "uranus",
        "pluto"
      ],
      "aspect-pattern:t_square:uranus-pluto:apex-moon": [
        "moon",
        "uranus",
        "pluto"
      ]
    },
    "sourceAspectIds": {
      "aspect-pattern:grand_square:moon-mars-jupiter-pluto": [
        "snapshot.aspect.jupiter.opposition.pluto",
        "snapshot.aspect.jupiter.square.mars",
        "snapshot.aspect.jupiter.square.moon",
        "snapshot.aspect.mars.opposition.moon",
        "snapshot.aspect.mars.square.pluto",
        "snapshot.aspect.moon.square.pluto"
      ],
      "aspect-pattern:grand_square:moon-mars-uranus-pluto": [
        "snapshot.aspect.mars.opposition.moon",
        "snapshot.aspect.mars.square.pluto",
        "snapshot.aspect.mars.square.uranus",
        "snapshot.aspect.moon.square.pluto",
        "snapshot.aspect.moon.square.uranus",
        "snapshot.aspect.pluto.opposition.uranus"
      ],
      "aspect-pattern:t_square:jupiter-pluto:apex-mars": [
        "snapshot.aspect.jupiter.opposition.pluto",
        "snapshot.aspect.jupiter.square.mars",
        "snapshot.aspect.mars.square.pluto"
      ],
      "aspect-pattern:t_square:jupiter-pluto:apex-moon": [
        "snapshot.aspect.jupiter.opposition.pluto",
        "snapshot.aspect.jupiter.square.moon",
        "snapshot.aspect.moon.square.pluto"
      ],
      "aspect-pattern:t_square:moon-mars:apex-jupiter": [
        "snapshot.aspect.jupiter.square.mars",
        "snapshot.aspect.jupiter.square.moon",
        "snapshot.aspect.mars.opposition.moon"
      ],
      "aspect-pattern:t_square:moon-mars:apex-pluto": [
        "snapshot.aspect.mars.opposition.moon",
        "snapshot.aspect.mars.square.pluto",
        "snapshot.aspect.moon.square.pluto"
      ],
      "aspect-pattern:t_square:moon-mars:apex-uranus": [
        "snapshot.aspect.mars.opposition.moon",
        "snapshot.aspect.mars.square.uranus",
        "snapshot.aspect.moon.square.uranus"
      ],
      "aspect-pattern:t_square:uranus-pluto:apex-mars": [
        "snapshot.aspect.mars.square.pluto",
        "snapshot.aspect.mars.square.uranus",
        "snapshot.aspect.pluto.opposition.uranus"
      ],
      "aspect-pattern:t_square:uranus-pluto:apex-moon": [
        "snapshot.aspect.moon.square.pluto",
        "snapshot.aspect.moon.square.uranus",
        "snapshot.aspect.pluto.opposition.uranus"
      ]
    },
    "roles": {
      "aspect-pattern:grand_square:moon-mars-jupiter-pluto": {
        "type": "grand_square",
        "planets": [
          "moon",
          "mars",
          "jupiter",
          "pluto"
        ],
        "oppositionAxes": [
          [
            "jupiter",
            "pluto"
          ],
          [
            "moon",
            "mars"
          ]
        ]
      },
      "aspect-pattern:grand_square:moon-mars-uranus-pluto": {
        "type": "grand_square",
        "planets": [
          "moon",
          "mars",
          "uranus",
          "pluto"
        ],
        "oppositionAxes": [
          [
            "moon",
            "mars"
          ],
          [
            "uranus",
            "pluto"
          ]
        ]
      },
      "aspect-pattern:t_square:jupiter-pluto:apex-mars": {
        "type": "t_square",
        "oppositionAxis": [
          "jupiter",
          "pluto"
        ],
        "apex": "mars",
        "emptyLeg": {
          "longitude": 161.2831,
          "sign": "virgo"
        }
      },
      "aspect-pattern:t_square:jupiter-pluto:apex-moon": {
        "type": "t_square",
        "oppositionAxis": [
          "jupiter",
          "pluto"
        ],
        "apex": "moon",
        "emptyLeg": {
          "longitude": 342.3265,
          "sign": "pisces"
        }
      },
      "aspect-pattern:t_square:moon-mars:apex-jupiter": {
        "type": "t_square",
        "oppositionAxis": [
          "moon",
          "mars"
        ],
        "apex": "jupiter",
        "emptyLeg": {
          "longitude": 70.6198,
          "sign": "gemini"
        }
      },
      "aspect-pattern:t_square:moon-mars:apex-pluto": {
        "type": "t_square",
        "oppositionAxis": [
          "moon",
          "mars"
        ],
        "apex": "pluto",
        "emptyLeg": {
          "longitude": 254.741,
          "sign": "sagittarius"
        }
      },
      "aspect-pattern:t_square:moon-mars:apex-uranus": {
        "type": "t_square",
        "oppositionAxis": [
          "moon",
          "mars"
        ],
        "apex": "uranus",
        "emptyLeg": {
          "longitude": 72.4796,
          "sign": "gemini"
        }
      },
      "aspect-pattern:t_square:uranus-pluto:apex-mars": {
        "type": "t_square",
        "oppositionAxis": [
          "uranus",
          "pluto"
        ],
        "apex": "mars",
        "emptyLeg": {
          "longitude": 161.2831,
          "sign": "virgo"
        }
      },
      "aspect-pattern:t_square:uranus-pluto:apex-moon": {
        "type": "t_square",
        "oppositionAxis": [
          "uranus",
          "pluto"
        ],
        "apex": "moon",
        "emptyLeg": {
          "longitude": 342.3265,
          "sign": "pisces"
        }
      }
    },
    "derivedPoints": {
      "aspect-pattern:grand_square:moon-mars-jupiter-pluto": [],
      "aspect-pattern:grand_square:moon-mars-uranus-pluto": [],
      "aspect-pattern:t_square:jupiter-pluto:apex-mars": [
        {
          "type": "empty_leg",
          "longitude": 161.2831,
          "sign": "virgo"
        },
        {
          "type": "opposite_apex",
          "longitude": 161.2831,
          "sign": "virgo"
        }
      ],
      "aspect-pattern:t_square:jupiter-pluto:apex-moon": [
        {
          "type": "empty_leg",
          "longitude": 342.3265,
          "sign": "pisces"
        },
        {
          "type": "opposite_apex",
          "longitude": 342.3265,
          "sign": "pisces"
        }
      ],
      "aspect-pattern:t_square:moon-mars:apex-jupiter": [
        {
          "type": "empty_leg",
          "longitude": 70.6198,
          "sign": "gemini"
        },
        {
          "type": "opposite_apex",
          "longitude": 70.6198,
          "sign": "gemini"
        }
      ],
      "aspect-pattern:t_square:moon-mars:apex-pluto": [
        {
          "type": "empty_leg",
          "longitude": 254.741,
          "sign": "sagittarius"
        },
        {
          "type": "opposite_apex",
          "longitude": 254.741,
          "sign": "sagittarius"
        }
      ],
      "aspect-pattern:t_square:moon-mars:apex-uranus": [
        {
          "type": "empty_leg",
          "longitude": 72.4796,
          "sign": "gemini"
        },
        {
          "type": "opposite_apex",
          "longitude": 72.4796,
          "sign": "gemini"
        }
      ],
      "aspect-pattern:t_square:uranus-pluto:apex-mars": [
        {
          "type": "empty_leg",
          "longitude": 161.2831,
          "sign": "virgo"
        },
        {
          "type": "opposite_apex",
          "longitude": 161.2831,
          "sign": "virgo"
        }
      ],
      "aspect-pattern:t_square:uranus-pluto:apex-moon": [
        {
          "type": "empty_leg",
          "longitude": 342.3265,
          "sign": "pisces"
        },
        {
          "type": "opposite_apex",
          "longitude": 342.3265,
          "sign": "pisces"
        }
      ]
    },
    "confidence": {
      "aspect-pattern:grand_square:moon-mars-jupiter-pluto": "strong",
      "aspect-pattern:grand_square:moon-mars-uranus-pluto": "strong",
      "aspect-pattern:t_square:jupiter-pluto:apex-mars": "strong",
      "aspect-pattern:t_square:jupiter-pluto:apex-moon": "strong",
      "aspect-pattern:t_square:moon-mars:apex-jupiter": "exact",
      "aspect-pattern:t_square:moon-mars:apex-pluto": "strong",
      "aspect-pattern:t_square:moon-mars:apex-uranus": "exact",
      "aspect-pattern:t_square:uranus-pluto:apex-mars": "strong",
      "aspect-pattern:t_square:uranus-pluto:apex-moon": "strong"
    },
    "warnings": {
      "diagnostics": [],
      "byPattern": {
        "aspect-pattern:grand_square:moon-mars-jupiter-pluto": [],
        "aspect-pattern:grand_square:moon-mars-uranus-pluto": [],
        "aspect-pattern:t_square:jupiter-pluto:apex-mars": [],
        "aspect-pattern:t_square:jupiter-pluto:apex-moon": [],
        "aspect-pattern:t_square:moon-mars:apex-jupiter": [],
        "aspect-pattern:t_square:moon-mars:apex-pluto": [],
        "aspect-pattern:t_square:moon-mars:apex-uranus": [],
        "aspect-pattern:t_square:uranus-pluto:apex-mars": [],
        "aspect-pattern:t_square:uranus-pluto:apex-moon": []
      }
    },
    "relationships": [
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "relationship": "contains"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "relationship": "contains"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "relationship": "contains"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "contains"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "contains"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "contains"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "contains"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "contains"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "childPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_planet"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_aspect"
      },
      {
        "parentPatternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "childPatternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "relationship": "shares_planet"
      }
    ],
    "rankingRecords": [
      {
        "patternId": "aspect-pattern:grand_square:moon-mars-uranus-pluto",
        "score": {
          "geometry": 28.5,
          "natalProminence": 61,
          "structuralContext": 12,
          "baseDisplayPriority": 101.5
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
            "code": "parent_pattern",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "mars",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "moon",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "pluto",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "uranus",
            "value": 6
          },
          {
            "code": "tight_geometry",
            "value": 28.5
          }
        ]
      },
      {
        "patternId": "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
        "score": {
          "geometry": 27.9,
          "natalProminence": 61,
          "structuralContext": 12,
          "baseDisplayPriority": 100.9
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
            "code": "parent_pattern",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "jupiter",
            "value": 6
          },
          {
            "code": "repeated_planet",
            "planet": "mars",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "moon",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "pluto",
            "value": 12
          },
          {
            "code": "tight_geometry",
            "value": 27.9
          }
        ]
      },
      {
        "patternId": "aspect-pattern:t_square:moon-mars:apex-uranus",
        "score": {
          "geometry": 38.8,
          "natalProminence": 49,
          "structuralContext": -4,
          "baseDisplayPriority": 83.8
        },
        "reasons": [
          {
            "code": "contained_pattern",
            "value": -4
          },
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
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "moon",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "uranus",
            "value": 6
          },
          {
            "code": "tight_geometry",
            "value": 38.8
          }
        ]
      },
      {
        "patternId": "aspect-pattern:t_square:moon-mars:apex-jupiter",
        "score": {
          "geometry": 38.3,
          "natalProminence": 49,
          "structuralContext": -4,
          "baseDisplayPriority": 83.3
        },
        "reasons": [
          {
            "code": "contained_pattern",
            "value": -4
          },
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
            "planet": "jupiter",
            "value": 6
          },
          {
            "code": "repeated_planet",
            "planet": "mars",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "moon",
            "value": 12
          },
          {
            "code": "tight_geometry",
            "value": 38.3
          }
        ]
      },
      {
        "patternId": "aspect-pattern:t_square:moon-mars:apex-pluto",
        "score": {
          "geometry": 28.5,
          "natalProminence": 55,
          "structuralContext": -4,
          "baseDisplayPriority": 79.5
        },
        "reasons": [
          {
            "code": "contained_pattern",
            "value": -4
          },
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
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "moon",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "pluto",
            "value": 12
          },
          {
            "code": "tight_geometry",
            "value": 28.5
          }
        ]
      },
      {
        "patternId": "aspect-pattern:t_square:uranus-pluto:apex-mars",
        "score": {
          "geometry": 28.5,
          "natalProminence": 41,
          "structuralContext": -4,
          "baseDisplayPriority": 65.5
        },
        "reasons": [
          {
            "code": "contained_pattern",
            "value": -4
          },
          {
            "code": "contains_chart_ruler",
            "planet": "mars",
            "value": 7
          },
          {
            "code": "contains_personal_planet",
            "planet": "mars",
            "value": 4
          },
          {
            "code": "repeated_planet",
            "planet": "mars",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "pluto",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "uranus",
            "value": 6
          },
          {
            "code": "tight_geometry",
            "value": 28.5
          }
        ]
      },
      {
        "patternId": "aspect-pattern:t_square:jupiter-pluto:apex-mars",
        "score": {
          "geometry": 27.9,
          "natalProminence": 41,
          "structuralContext": -4,
          "baseDisplayPriority": 64.9
        },
        "reasons": [
          {
            "code": "contained_pattern",
            "value": -4
          },
          {
            "code": "contains_chart_ruler",
            "planet": "mars",
            "value": 7
          },
          {
            "code": "contains_personal_planet",
            "planet": "mars",
            "value": 4
          },
          {
            "code": "repeated_planet",
            "planet": "jupiter",
            "value": 6
          },
          {
            "code": "repeated_planet",
            "planet": "mars",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "pluto",
            "value": 12
          },
          {
            "code": "tight_geometry",
            "value": 27.9
          }
        ]
      },
      {
        "patternId": "aspect-pattern:t_square:uranus-pluto:apex-moon",
        "score": {
          "geometry": 29.6,
          "natalProminence": 38,
          "structuralContext": -4,
          "baseDisplayPriority": 63.6
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
            "code": "repeated_planet",
            "planet": "moon",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "pluto",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "uranus",
            "value": 6
          },
          {
            "code": "tight_geometry",
            "value": 29.6
          }
        ]
      },
      {
        "patternId": "aspect-pattern:t_square:jupiter-pluto:apex-moon",
        "score": {
          "geometry": 27.9,
          "natalProminence": 38,
          "structuralContext": -4,
          "baseDisplayPriority": 61.9
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
            "code": "repeated_planet",
            "planet": "jupiter",
            "value": 6
          },
          {
            "code": "repeated_planet",
            "planet": "moon",
            "value": 12
          },
          {
            "code": "repeated_planet",
            "planet": "pluto",
            "value": 12
          },
          {
            "code": "tight_geometry",
            "value": 27.9
          }
        ]
      }
    ],
    "displayOrder": [
      "aspect-pattern:grand_square:moon-mars-uranus-pluto",
      "aspect-pattern:grand_square:moon-mars-jupiter-pluto",
      "aspect-pattern:t_square:moon-mars:apex-uranus",
      "aspect-pattern:t_square:moon-mars:apex-jupiter",
      "aspect-pattern:t_square:moon-mars:apex-pluto",
      "aspect-pattern:t_square:uranus-pluto:apex-mars",
      "aspect-pattern:t_square:jupiter-pluto:apex-mars",
      "aspect-pattern:t_square:uranus-pluto:apex-moon",
      "aspect-pattern:t_square:jupiter-pluto:apex-moon"
    ],
    "diagnostics": {
      "inputPlanetCount": 10,
      "inputAspectCount": 14,
      "eligibleAspectCount": 14,
      "skippedAspects": [],
      "warnings": []
    }
  },
  "validation": {
    "approved": true,
    "issueClassifications": [],
    "notes": [
      "EXPECTED_AMBIGUITY: overlapping Grand Squares and retained component T-squares are intentional."
    ]
  }
};
