"use strict";

function planet(id, longitude, sign) {
  return { id, longitude, sign };
}

function aspect(id, pointA, pointB, type, orb = 0, extra = {}) {
  return { id, pointA, pointB, type, exactAngle: exactAngle(type), orb, ...extra };
}

function exactAngle(type) {
  return {
    opposition: 180,
    trine: 120,
    square: 90,
    sextile: 60,
    quincunx: 150
  }[type];
}

const fixtures = Object.freeze({
  grand_square: Object.freeze({
    planets: Object.freeze([
      planet("sun", 0, "aries"),
      planet("moon", 90, "cancer"),
      planet("mars", 180, "libra"),
      planet("saturn", 270, "capricorn")
    ]),
    aspects: Object.freeze([
      aspect("gs-sun-moon-square", "sun", "moon", "square", 0.4),
      aspect("gs-moon-mars-square", "moon", "mars", "square", 0.6),
      aspect("gs-mars-saturn-square", "mars", "saturn", "square", 0.7),
      aspect("gs-sun-saturn-square", "sun", "saturn", "square", 0.5),
      aspect("gs-sun-mars-opposition", "sun", "mars", "opposition", 0.2),
      aspect("gs-moon-saturn-opposition", "moon", "saturn", "opposition", 0.3)
    ])
  }),

  t_square: Object.freeze({
    planets: Object.freeze([
      planet("sun", 10, "aries"),
      planet("moon", 190, "libra"),
      planet("mars", 100, "cancer")
    ]),
    aspects: Object.freeze([
      aspect("ts-sun-moon-opposition", "sun", "moon", "opposition", 1.1),
      aspect("ts-sun-mars-square", "sun", "mars", "square", 0.8),
      aspect("ts-moon-mars-square", "moon", "mars", "square", 1.3)
    ])
  }),

  grand_trine: Object.freeze({
    planets: Object.freeze([
      planet("sun", 10, "aries"),
      planet("moon", 130, "leo"),
      planet("mars", 250, "sagittarius")
    ]),
    aspects: Object.freeze([
      aspect("gt-sun-moon-trine", "sun", "moon", "trine", 1.2),
      aspect("gt-sun-mars-trine", "sun", "mars", "trine", 1),
      aspect("gt-moon-mars-trine", "moon", "mars", "trine", 0.7)
    ])
  }),

  kite: Object.freeze({
    planets: Object.freeze([
      planet("sun", 0, "aries"),
      planet("moon", 120, "leo"),
      planet("mars", 240, "sagittarius"),
      planet("saturn", 60, "gemini")
    ]),
    aspects: Object.freeze([
      aspect("kt-sun-moon-trine", "sun", "moon", "trine", 0.5),
      aspect("kt-sun-mars-trine", "sun", "mars", "trine", 0.5),
      aspect("kt-moon-mars-trine", "moon", "mars", "trine", 0.5),
      aspect("kt-mars-saturn-opposition", "mars", "saturn", "opposition", 0.4),
      aspect("kt-sun-saturn-sextile", "sun", "saturn", "sextile", 0.6),
      aspect("kt-moon-saturn-sextile", "moon", "saturn", "sextile", 0.6)
    ])
  }),

  yod: Object.freeze({
    planets: Object.freeze([
      planet("moon", 0, "aries"),
      planet("venus", 60, "gemini"),
      planet("saturn", 210, "scorpio")
    ]),
    aspects: Object.freeze([
      aspect("yd-moon-venus-sextile", "moon", "venus", "sextile", 0.3),
      aspect("yd-moon-saturn-quincunx", "moon", "saturn", "quincunx", 0.8),
      aspect("yd-venus-saturn-quincunx", "venus", "saturn", "quincunx", 0.7)
    ])
  }),

  mystic_rectangle: Object.freeze({
    planets: Object.freeze([
      planet("sun", 0, "aries"),
      planet("moon", 60, "gemini"),
      planet("mars", 180, "libra"),
      planet("saturn", 240, "sagittarius")
    ]),
    aspects: Object.freeze([
      aspect("mr-sun-mars-opposition", "sun", "mars", "opposition", 0.4),
      aspect("mr-moon-saturn-opposition", "moon", "saturn", "opposition", 0.4),
      aspect("mr-sun-moon-sextile", "sun", "moon", "sextile", 0.6),
      aspect("mr-mars-saturn-sextile", "mars", "saturn", "sextile", 0.6),
      aspect("mr-moon-mars-trine", "moon", "mars", "trine", 0.7),
      aspect("mr-sun-saturn-trine", "sun", "saturn", "trine", 0.7)
    ])
  }),

  angle_node_ignored: Object.freeze({
    planets: Object.freeze([
      planet("sun", 0, "aries"),
      planet("moon", 180, "libra"),
      { id: "ascendant", longitude: 90, sign: "cancer" },
      { id: "north_node", longitude: 270, sign: "capricorn" }
    ]),
    aspects: Object.freeze([
      aspect("ang-sun-moon-opposition", "sun", "moon", "opposition", 0),
      aspect("ang-sun-asc-square", "sun", "ascendant", "square", 0),
      aspect("ang-moon-asc-square", "moon", "ascendant", "square", 0),
      aspect("ang-sun-node-square", "sun", "north_node", "square", 0),
      aspect("ang-moon-node-square", "moon", "north_node", "square", 0)
    ])
  }),

  wide_grand_trine: Object.freeze({
    planets: Object.freeze([
      planet("sun", 8, "aries"),
      planet("moon", 132, "leo"),
      planet("mars", 248, "sagittarius")
    ]),
    aspects: Object.freeze([
      aspect("wgt-sun-moon-trine", "sun", "moon", "trine", 5.4),
      aspect("wgt-sun-mars-trine", "sun", "mars", "trine", 5.1),
      aspect("wgt-moon-mars-trine", "moon", "mars", "trine", 5.3)
    ])
  }),

  partial_t_square: Object.freeze({
    planets: Object.freeze([
      planet("sun", 10, "aries"),
      planet("moon", 190, "libra"),
      planet("mars", 101, "cancer")
    ]),
    aspects: Object.freeze([
      aspect("pts-sun-moon-opposition", "sun", "moon", "opposition", 1),
      aspect("pts-sun-mars-square", "sun", "mars", "square", 7.5),
      aspect("pts-moon-mars-square", "moon", "mars", "square", 1)
    ])
  }),

  invalid_near_pattern: Object.freeze({
    planets: Object.freeze([
      planet("sun", 10, "aries"),
      planet("moon", 190, "libra"),
      planet("mars", 100, "cancer")
    ]),
    aspects: Object.freeze([
      aspect("inv-sun-moon-opposition", "sun", "moon", "opposition", 1.1),
      aspect("inv-sun-mars-square", "sun", "mars", "square", 0.8)
    ])
  }),

  out_of_sign_grand_trine: Object.freeze({
    planets: Object.freeze([
      planet("sun", 29, "aries"),
      planet("moon", 149, "virgo"),
      planet("mars", 269, "sagittarius")
    ]),
    aspects: Object.freeze([
      aspect("osgt-sun-moon-trine", "sun", "moon", "trine", 1, { outOfSign: true }),
      aspect("osgt-sun-mars-trine", "sun", "mars", "trine", 1, { outOfSign: true }),
      aspect("osgt-moon-mars-trine", "moon", "mars", "trine", 1, { outOfSign: true })
    ])
  })
});

module.exports = {
  fixtures
};
