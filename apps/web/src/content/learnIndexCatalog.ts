import { houseCatalog } from "./learnCatalog";

export type LearnElement = "Fire" | "Earth" | "Air" | "Water";

export const LEARN_JUMP_LINKS = [
  { id: "houses", label: "Houses", glyph: "1H" },
  { id: "signs", label: "Signs", glyph: "♈︎" },
  { id: "planets", label: "Planets", glyph: "☉" },
  { id: "points", label: "Points", glyph: "☊" },
  { id: "aspects", label: "Aspects", glyph: "△" },
  { id: "retrogrades", label: "Retrogrades", glyph: "℞" },
  { id: "moon", label: "Moon", glyph: "☾" }
] as const;

const HOUSE_RULERS = [
  "Mars",
  "Venus",
  "Mercury",
  "The Moon",
  "The Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Saturn",
  "Jupiter"
] as const;

export const LEARN_HOUSE_INDEX = HOUSE_RULERS.map((ruler, index) => {
  const house = houseCatalog(index + 1);
  if (!house) throw new Error(`Missing house catalog for ${index + 1}`);
  return {
    id: String(house.house).padStart(2, "0"),
    code: `${house.house}H`,
    roman: house.roman,
    name: house.name,
    glyph: house.naturalGlyph,
    ruler
  };
});

export const LEARN_SIGN_INDEX = [
  { id: "aries", glyph: "♈︎", name: "Aries", element: "Fire" as const, mode: "Cardinal", emoji: "🔥" },
  { id: "taurus", glyph: "♉︎", name: "Taurus", element: "Earth" as const, mode: "Fixed", emoji: "🌱" },
  { id: "gemini", glyph: "♊︎", name: "Gemini", element: "Air" as const, mode: "Mutable", emoji: "💨" },
  { id: "cancer", glyph: "♋︎", name: "Cancer", element: "Water" as const, mode: "Cardinal", emoji: "💧" },
  { id: "leo", glyph: "♌︎", name: "Leo", element: "Fire" as const, mode: "Fixed", emoji: "🔥" },
  { id: "virgo", glyph: "♍︎", name: "Virgo", element: "Earth" as const, mode: "Mutable", emoji: "🌱" },
  { id: "libra", glyph: "♎︎", name: "Libra", element: "Air" as const, mode: "Cardinal", emoji: "💨" },
  { id: "scorpio", glyph: "♏︎", name: "Scorpio", element: "Water" as const, mode: "Fixed", emoji: "💧" },
  { id: "sagittarius", glyph: "♐︎", name: "Sagittarius", element: "Fire" as const, mode: "Mutable", emoji: "🔥" },
  { id: "capricorn", glyph: "♑︎", name: "Capricorn", element: "Earth" as const, mode: "Cardinal", emoji: "🌱" },
  { id: "aquarius", glyph: "♒︎", name: "Aquarius", element: "Air" as const, mode: "Fixed", emoji: "💨" },
  { id: "pisces", glyph: "♓︎", name: "Pisces", element: "Water" as const, mode: "Mutable", emoji: "💧" }
] as const;

export const LEARN_PLANET_INDEX = [
  { id: "sun", glyph: "☉", extraGlyph: "☀️", name: "Sun", meta: "Traditional", detail: "Rules Leo", target: "sun-moon-and-rising" },
  { id: "moon", glyph: "☽", extraGlyph: "🌙", name: "Moon", meta: "Traditional", detail: "Rules Cancer", target: "sun-moon-and-rising" },
  { id: "mercury", glyph: "☿", extraGlyph: "🪽", name: "Mercury", meta: "Traditional", detail: "Rules Gemini & Virgo", target: "the-planets-and-points" },
  { id: "venus", glyph: "♀", extraGlyph: "💖", name: "Venus", meta: "Traditional", detail: "Rules Taurus & Libra", target: "the-planets-and-points" },
  { id: "mars", glyph: "♂", extraGlyph: "🔥", name: "Mars", meta: "Traditional", detail: "Rules Aries & Scorpio", target: "the-planets-and-points" },
  { id: "jupiter", glyph: "♃", extraGlyph: "👑", name: "Jupiter", meta: "Traditional", detail: "Rules Sagittarius & Pisces", target: "the-planets-and-points" },
  { id: "saturn", glyph: "♄", extraGlyph: "🪐", name: "Saturn", meta: "Traditional", detail: "Rules Capricorn & Aquarius", target: "the-planets-and-points" },
  { id: "uranus", glyph: "♅", extraGlyph: "⚡", name: "Uranus", meta: "Modern", detail: "Rules Nothing", target: "the-planets-and-points" },
  { id: "neptune", glyph: "♆", extraGlyph: "🌊", name: "Neptune", meta: "Modern", detail: "Rules Nothing", target: "the-planets-and-points" },
  { id: "pluto", glyph: "♇", extraGlyph: "🗝️", name: "Pluto", meta: "Modern", detail: "Rules Nothing", target: "the-planets-and-points" }
] as const;

export const LEARN_POINT_INDEX = [
  { id: "ascendant", glyph: "AC", name: "Ascendant", meta: "Angle", detail: "How you arrive, and the hinge every other house counts out from." },
  { id: "descendant", glyph: "DC", name: "Descendant", meta: "Angle", detail: "Who you meet in other people, and what you keep choosing." },
  { id: "midheaven", glyph: "MC", name: "Midheaven", meta: "Angle", detail: "Career, reputation, and what you are known for at a distance." },
  { id: "imum-coeli", glyph: "IC", name: "Imum Coeli", meta: "Angle", detail: "Home, family, and the private foundation nobody else sees." },
  { id: "north-node", glyph: "☊", name: "North Node", meta: "Point", detail: "The unfamiliar direction. Slow, unglamorous, and worth the cost." },
  { id: "south-node", glyph: "☋", name: "South Node", meta: "Point", detail: "The old groove. What you already know how to do in your sleep." },
  { id: "lilith", glyph: "⚸", name: "Lilith (Black Moon Lilith)", meta: "Point", detail: "A calculated point, read as the place you will not comply." },
  { id: "part-of-fortune", glyph: "⊗", name: "Part of Fortune", meta: "Point", detail: "A lot built from the Ascendant, Sun and Moon. Where ease collects." },
  { id: "chiron", glyph: "⚷", name: "Chiron", meta: "Asteroid", detail: "The tender spot, and the thing you turn out to be good at helping with." }
] as const;

export const LEARN_ASPECT_INDEX = [
  { glyph: "☌", name: "Conjunction", angle: "0°", kind: "Major", blurb: "Fused. Two planets acting as one." },
  { glyph: "☍", name: "Opposition", angle: "180°", kind: "Major", blurb: "Tension across the chart. A seesaw." },
  { glyph: "△", name: "Trine", angle: "120°", kind: "Major", blurb: "Ease and flow. Same element." },
  { glyph: "□", name: "Square", angle: "90°", kind: "Major", blurb: "Friction that forces action." },
  { glyph: "⚹", name: "Sextile", angle: "60°", kind: "Major", blurb: "Opportunity, if you take it." },
  { glyph: "⚻", name: "Quincunx", angle: "150°", kind: "Minor", blurb: "Awkward. Nothing in common." },
  { glyph: "⚺", name: "Semi-sextile", angle: "30°", kind: "Minor", blurb: "Neighbours who barely talk." },
  { glyph: "∠", name: "Semi-square", angle: "45°", kind: "Minor", blurb: "A low, nagging irritation." },
  { glyph: "⚼", name: "Sesquiquadrate", angle: "135°", kind: "Minor", blurb: "Friction that builds slowly." },
  { glyph: "Q", name: "Quintile", angle: "72°", kind: "Minor", blurb: "Talent and pattern-making." }
] as const;

export const LEARN_RETROGRADE_SKY_INDEX = [
  { id: "mercury-rx-sky", glyph: "☿", name: "Mercury Rx", meta: "3 to 4 times a year", detail: "Messages double back. A period biased toward review, not launch." },
  { id: "venus-rx-sky", glyph: "♀", name: "Venus Rx", meta: "Every 18 months, about 40 days", detail: "Love, money and taste come up for honest reconsideration." },
  { id: "mars-rx-sky", glyph: "♂", name: "Mars Rx", meta: "Every 2 years, 8 to 10 weeks", detail: "Drive turns inward. Better for practice than for picking a fight." },
  { id: "jupiter-rx-sky", glyph: "♃", name: "Jupiter Rx", meta: "{{ephemeris:jupiter_rx_frequency}}", detail: "Growth slows down and gets honest about its own results." },
  { id: "saturn-rx-sky", glyph: "♄", name: "Saturn Rx", meta: "{{ephemeris:saturn_rx_frequency}}", detail: "The rules you set for yourself come up for renewal." },
  { id: "uranus-rx-sky", glyph: "♅", name: "Uranus Rx", meta: "Close to half of every year", detail: "Retrograde close to half the year, so the status is not the news." },
  { id: "neptune-rx-sky", glyph: "♆", name: "Neptune Rx", meta: "Close to half of every year", detail: "The fog thins. Illusions get harder to keep hold of." },
  { id: "pluto-rx-sky", glyph: "♇", name: "Pluto Rx", meta: "Close to half of every year", detail: "Power turns inward. What you control, and what controls you." }
] as const;

export const LEARN_RETROGRADE_NATAL_INDEX = [
  { id: "mercury-rx-natal", glyph: "☿", name: "Mercury Rx", meta: "At birth", detail: "A mind that works it through privately before it says anything." },
  { id: "venus-rx-natal", glyph: "♀", name: "Venus Rx", meta: "At birth", detail: "Love and worth arrived at rather than inherited." },
  { id: "mars-rx-natal", glyph: "♂", name: "Mars Rx", meta: "At birth", detail: "The drive is real and indirect. A longer fuse, a harder aim to see." },
  { id: "jupiter-rx-natal", glyph: "♃", name: "Jupiter Rx", meta: "At birth", detail: "Meaning built from the inside instead of taken on trust." },
  { id: "saturn-rx-natal", glyph: "♄", name: "Saturn Rx", meta: "At birth", detail: "Authority worked out for yourself. Common, and not a mark against you." },
  { id: "uranus-rx-natal", glyph: "♅", name: "Uranus Rx", meta: "At birth", detail: "So common it describes a cohort. Read the house instead." },
  { id: "neptune-rx-natal", glyph: "♆", name: "Neptune Rx", meta: "At birth", detail: "Intuition kept private, and a sharp eye for other people's stories." },
  { id: "pluto-rx-natal", glyph: "♇", name: "Pluto Rx", meta: "At birth", detail: "Change as an inside job. Power felt more often than shown." }
] as const;

export const LEARN_PHASE_INDEX = [
  { id: "new-moon", glyph: "🌑", name: "New Moon", meta: "0°", detail: "Sun and Moon at the same degree. Dark sky, and the start of the count." },
  { id: "waxing-crescent", glyph: "🌒", name: "Waxing crescent", meta: "45°", detail: "The first thin sliver, and the early doubt that proves nothing." },
  { id: "first-quarter", glyph: "🌓", name: "First quarter", meta: "90°", detail: "Half lit. The first real obstacle, and a decision that wants making." },
  { id: "waxing-gibbous", glyph: "🌔", name: "Waxing gibbous", meta: "135°", detail: "Almost full. The unglamorous last stretch of adjustment." },
  { id: "full-moon", glyph: "🌕", name: "Full Moon", meta: "180°", detail: "Sun and Moon opposite. Everything lit, including what it cost." },
  { id: "waning-gibbous", glyph: "🌖", name: "Waning gibbous", meta: "225°", detail: "Past full. What you do with what you just found out." },
  { id: "last-quarter", glyph: "🌗", name: "Last quarter", meta: "270°", detail: "Half dark again. The thing you have to stop doing." },
  { id: "waning-crescent", glyph: "🌘", name: "Waning crescent", meta: "315°", detail: "The last light before dark. Rest, and not as a reward." }
] as const;

export const LEARN_ECLIPSE_INDEX = [
  { id: "eclipse-season", glyph: "☊", name: "Eclipse season", meta: "Twice a year", detail: "About 34 days, twice a year, holding two eclipses and sometimes three." },
  { id: "solar-eclipse", glyph: "🌑", name: "Solar eclipse", meta: "New Moon + node", detail: "A New Moon near a node. Things move faster than expected." },
  { id: "lunar-eclipse", glyph: "🌕", name: "Lunar eclipse", meta: "Full Moon + node", detail: "A Full Moon near a node. Something ends, or is finally seen." },
  { id: "eclipse-axis", glyph: "♈︎", name: "The eclipse axis", meta: "About 18 months", detail: "Eclipses work one pair of houses for about 18 months, then move on." }
] as const;
