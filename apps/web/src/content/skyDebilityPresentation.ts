import { skyPlacementLinkLabel, type BodyMotion } from "./skyMotionLabels";
import { isDisplayRetrograde } from "../services/astrologyDisplay";
import { DIGNITY_SIGNS, TRADITIONAL_DIGNITY_PLANETS } from "../services/planetSignDignity.mjs";

export type SkyDebilityDisplayPart = {
  text: string;
  slot?: string;
  kind?: "template" | "phrase" | "fact" | "grammar";
  sourceKey?: string;
  href?: string;
  emphasized?: boolean;
};
export type SkyDebilityDisplayPosition = { planet: string; sign: string; motion?: BodyMotion };
export type SkyDebilityPlacementLink = { text: string; href: string; separator?: string };
const normalized = (value: string) => value.trim().toLowerCase();
const placementListSlots = new Set(["planetList", "detrimentPlanetList", "fallPlanetList", "dignityPlacementList"]);

/** Calculated qualifying keys come from the assembler. Motion must match the
 * exact planet/sign snapshot; missing motion is never guessed. */
export function skyDebilityPlacementLinks(keys: readonly string[], positions: readonly SkyDebilityDisplayPosition[] = [], style: "compact" | "reading" = "compact"): SkyDebilityPlacementLink[] {
  return keys.map((key, index) => {
    const [planetKey, signKey] = key.split("/");
    const planet = TRADITIONAL_DIGNITY_PLANETS.find(value => normalized(value) === planetKey);
    const sign = DIGNITY_SIGNS.find(value => normalized(value) === signKey);
    if (!planet || !sign) throw new Error(`Invalid calculated effort-summary placement: ${key}`);
    const position = positions.find(value => normalized(value.planet) === planetKey && normalized(value.sign) === signKey);
    // The general display helper excludes lunar nodes, not luminaries.
    // Never display an impossible Sun/Moon Rx marker, even for invalid input.
    const motion = planet !== "Sun" && planet !== "Moon" && position?.motion
      && isDisplayRetrograde({ planet, motion: position.motion }) ? "retrograde" : undefined;
    const text = style === "reading"
      ? `${planet === "Sun" || planet === "Moon" ? "the " : ""}${planet}${motion ? " retrograde" : ""} in ${sign}`
      : skyPlacementLinkLabel(planet, sign, motion);
    const separator = style === "reading" && index === keys.length - 1 ? keys.length === 2 ? " and " : ", and " : ", ";
    return { text, ...(style === "reading" ? { separator } : {}), href: `#sky/placement/${encodeURIComponent(planetKey)}/${encodeURIComponent(signKey)}` };
  });
}

/** Preserve validated token boundaries rather than searching rendered prose. */
export function skyDebilityTemplateParts(template: string, slots: Readonly<Record<string, string>>): SkyDebilityDisplayPart[] {
  return template.split(/(\{[^{}]+\})/gu).filter(Boolean).map(text => {
    const token = /^\{([^{}]+)\}$/u.exec(text);
    return token ? { text: slots[token[1]] ?? text, slot: token[1], kind: "fact" } : { text, kind: "template" };
  });
}

/** Emphasize the calculated count through its sentence-ending period, or up
 * to the colon before a placement list. Preserve all wording and source keys. */
export function emphasizeSkyDebilityCount(parts: readonly SkyDebilityDisplayPart[]): SkyDebilityDisplayPart[] {
  const start = parts.findIndex(part => part.slot === "countWord");
  if (start < 0) return [...parts];
  const remaining = new Set(["countWord", "totalWord", "countVerb"]);
  for (let end = start; end < parts.length; end++) {
    const part = parts[end];
    if (part.slot) {
      if (!remaining.delete(part.slot)) return [...parts];
      continue;
    }
    const delimiter = /[.:]/u.exec(part.text);
    if (!delimiter) continue;
    if (remaining.size || delimiter[0] === ":" && (!placementListSlots.has(parts[end + 1]?.slot ?? "") || !/^:\s*$/u.test(part.text.slice(delimiter.index)))) return [...parts];
    const boundary = delimiter.index + (delimiter[0] === "." ? 1 : 0);
    const prefix = parts.slice(start, end).map(value => ({ ...value, emphasized: true }));
    if (boundary) prefix.push({ ...part, text: part.text.slice(0, boundary), emphasized: true });
    const suffix = part.text.slice(boundary);
    return [...parts.slice(0, start), ...prefix, ...(suffix ? [{ ...part, text: suffix }] : []), ...parts.slice(end + 1)];
  }
  return [...parts];
}

/** Reader and Studio link only declared calculated placement lists, preserving
 * authored wording, category membership, conjunctions, and editor sources. */
export function presentSkyDebilityParts(parts: readonly SkyDebilityDisplayPart[], links: readonly SkyDebilityPlacementLink[]): SkyDebilityDisplayPart[] {
  const highlighted = emphasizeSkyDebilityCount(parts);
  return highlighted.flatMap((part, index): SkyDebilityDisplayPart[] => {
    if (!placementListSlots.has(part.slot ?? "") || !links.length) return [part];
    if (part.slot === "dignityPlacementList") return part.text.split(/(,? and |, |; | is in | are in )/u).map(text => {
      const link = links.find(value => value.text.replace(" retrograde in ", " in ") === text);
      return { ...part, text: link?.text ?? text, href: link?.href };
    });
    if (part.slot !== "planetList") return part.text.split(/(,? and |, )/u).map(text => ({
      ...part, text, href: links.find(link => link.text === text)?.href
    }));
    if (highlighted[index - 1]?.slot === "planetList") return [];
    return links.flatMap((link, i) => [
      ...(i ? [{ text: link.separator ?? ", ", slot: "planetList", kind: "grammar" as const }] : []),
      { ...link, slot: "planetList", kind: "fact" as const }
    ]);
  });
}
