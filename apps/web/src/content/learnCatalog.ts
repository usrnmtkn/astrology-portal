export const LEARN_HERO_GLYPHS = ["☉", "☽", "☿", "♀", "♂", "♃", "♄", "⚷", "♅", "♆", "♇", "☊"];

const HOUSE_SHORT_NAMES = [
  "Self",
  "Wealth & Self-Worth",
  "Siblings",
  "Home",
  "Pleasure",
  "Work",
  "Partners",
  "Shared resources",
  "Belief",
  "Career",
  "Friends",
  "Retreat"
] as const;

const HOUSE_ANGULARITY = [
  "Angular",
  "Succedent",
  "Cadent",
  "Angular",
  "Succedent",
  "Cadent",
  "Angular",
  "Succedent",
  "Cadent",
  "Angular",
  "Succedent",
  "Cadent"
] as const;

const HOUSE_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"] as const;
const NATURAL_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
] as const;
const SIGN_GLYPHS: Record<string, string> = {
  aries: "♈",
  taurus: "♉",
  gemini: "♊",
  cancer: "♋",
  leo: "♌",
  virgo: "♍",
  libra: "♎",
  scorpio: "♏",
  sagittarius: "♐",
  capricorn: "♑",
  aquarius: "♒",
  pisces: "♓"
};

export function houseNumberFromContentKey(contentKey: string) {
  const match = contentKey.match(/\/house\/(\d{1,2})$/u);
  if (!match) return 0;
  const value = Number(match[1]);
  return value >= 1 && value <= 12 ? value : 0;
}

export function signKeyFromContentKey(contentKey: string) {
  const match = contentKey.match(/\/sign\/([a-z]+)$/u);
  return match?.[1] ?? "";
}

export function houseOrdinal(house: number) {
  if (house === 1) return "1st house";
  if (house === 2) return "2nd house";
  if (house === 3) return "3rd house";
  return `${house}th house`;
}

export function houseCatalog(house: number) {
  if (house < 1 || house > 12) return null;
  const sign = NATURAL_SIGNS[house - 1];
  return {
    house,
    roman: HOUSE_ROMAN[house - 1],
    name: HOUSE_SHORT_NAMES[house - 1],
    ordinal: houseOrdinal(house),
    angularity: HOUSE_ANGULARITY[house - 1],
    naturalSign: sign,
    naturalGlyph: SIGN_GLYPHS[sign.toLowerCase()] ?? ""
  };
}

export function signCatalog(signKey: string) {
  const glyph = SIGN_GLYPHS[signKey] ?? "";
  if (!glyph) return null;
  const name = signKey.slice(0, 1).toUpperCase() + signKey.slice(1);
  return { key: signKey, name, glyph };
}

export function chapterIndexLabel(index: number) {
  return String(index + 1).padStart(2, "0");
}
