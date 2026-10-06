import { DIGNITY_SIGNS, TRADITIONAL_DIGNITY_PLANETS, planetSignDebilities, traditionalSkyDebilities } from "../services/planetSignDignity.mjs";

export const SKY_DEBILITY_INTERPRETATION_PREFIX = "cms/sky-debility/reading/";
export const skyDebilityInterpretationSlots = ["count", "total", "countWord", "totalWord", "countVerb", "planetWord", "planetReference", "planetList", "detrimentCount", "fallCount", "detrimentPlanetList", "fallPlanetList"];
const normalize = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";

/** An exact combination, never a planet count or a date-based copy rotation. */
export function skyDebilityInterpretationKey(positions) {
  if (!Array.isArray(positions)) return null;
  const snapshot = traditionalSkyDebilities(positions);
  if (snapshot.knownCount !== 7 || !snapshot.count) return null;
  if (TRADITIONAL_DIGNITY_PLANETS.some(planet => positions.filter(row => normalize(row?.planet) === normalize(planet)).length !== 1)) return null;
  const parts = [];
  for (const row of snapshot.planets) {
    const matches = positions.filter(value => normalize(value?.planet) === normalize(row?.planet));
    // Conflicting or incomplete inputs must not select a condition-specific reading.
    if (matches.length !== 1 || normalize(matches[0].sign) !== normalize(row.sign)) return null;
    const motion = row.planet === "Sun" || row.planet === "Moon" ? "direct" : matches[0].motion;
    if (motion !== "direct" && motion !== "retrograde") return null;
    parts.push(`${normalize(row?.planet)}-${normalize(row.sign)}-${motion}`);
  }
  return `${SKY_DEBILITY_INTERPRETATION_PREFIX}${parts.join("__")}`;
}

export function skyDebilityInterpretationPlacements(key) {
  if (!key.startsWith(SKY_DEBILITY_INTERPRETATION_PREFIX)) return null;
  const parts = key.slice(SKY_DEBILITY_INTERPRETATION_PREFIX.length).split("__");
  if (parts.length > 7) return null;
  const rows = [];
  let previousIndex = -1;
  for (const part of parts) {
    const [planetKey, signKey, motion, extra] = part.split("-");
    const planetIndex = TRADITIONAL_DIGNITY_PLANETS.findIndex(value => normalize(value) === planetKey);
    const planet = TRADITIONAL_DIGNITY_PLANETS[planetIndex];
    const sign = DIGNITY_SIGNS.find(value => normalize(value) === signKey);
    if (extra !== undefined || !planet || !sign || planetIndex <= previousIndex
      || !planetSignDebilities(planet, sign).length || !["direct", "retrograde"].includes(motion)
      || ((planet === "Sun" || planet === "Moon") && motion !== "direct")) return null;
    rows.push({ planet, sign, motion });
    previousIndex = planetIndex;
  }
  return rows.length ? rows : null;
}

export function skyDebilityInterpretationErrors(key, body, headline) {
  const errors = [];
  const placements = skyDebilityInterpretationPlacements(key);
  if (!placements) errors.push("Choose a complete, valid qualifying combination.");
  const slots = [...body.matchAll(/\{([^{}]+)\}/gu)].map(match => match[1]);
  if (!body.trim()) errors.push("Write the complete interpretation.");
  if (/[{}]/u.test(body.replace(/\{[^{}]+\}/gu, "")) || body.includes("{{") || body.includes("}}")) errors.push("Use matching single braces for calculated facts.");
  if (slots.some(slot => !skyDebilityInterpretationSlots.includes(slot))) errors.push("Use only calculated fact variables in a complete interpretation.");
  const allLists = slots.filter(slot => slot === "planetList").length;
  const categoryLists = placements && ["detriment", "fall"].every(dignity => {
    const count = slots.filter(slot => slot === `${dignity}PlanetList`).length;
    return count <= 1 && (count === 1 || !placements.some(row => planetSignDebilities(row.planet, row.sign).includes(dignity)));
  });
  if (allLists !== 1 && !(allLists === 0 && categoryLists)) errors.push("Include {planetList} once, or each applicable {detrimentPlanetList} and {fallPlanetList} once, so every qualifying placement is shown.");
  if (/[<>]/u.test(body)) errors.push("Use plain text, not markup.");
  if (headline !== undefined && (!headline?.trim() || /[{}<>\r\n]/u.test(headline))) errors.push("Give the complete card a plain-text heading without variables.");
  return errors;
}
