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
export type SkyDebilityPlacementLink = { text: string; href: string };
const normalized = (value: string) => value.trim().toLowerCase();

/** Calculated qualifying keys come from the assembler. Motion must match the
 * exact planet/sign snapshot; missing motion is never guessed. */
export function skyDebilityPlacementLinks(keys: readonly string[], positions: readonly SkyDebilityDisplayPosition[] = []): SkyDebilityPlacementLink[] {
  return keys.map(key => {
    const [planetKey, signKey] = key.split("/");
    const planet = TRADITIONAL_DIGNITY_PLANETS.find(value => normalized(value) === planetKey);
    const sign = DIGNITY_SIGNS.find(value => normalized(value) === signKey);
    if (!planet || !sign) throw new Error(`Invalid calculated effort-summary placement: ${key}`);
    const position = positions.find(value => normalized(value.planet) === planetKey && normalized(value.sign) === signKey);
    const motion = position?.motion && isDisplayRetrograde({ planet, motion: position.motion }) ? "retrograde" : undefined;
    return { text: skyPlacementLinkLabel(planet, sign, motion), href: `#sky/placement/${encodeURIComponent(planetKey)}/${encodeURIComponent(signKey)}` };
  });
}

/** Preserve validated token boundaries rather than searching rendered prose. */
export function skyDebilityTemplateParts(template: string, slots: Readonly<Record<string, string>>): SkyDebilityDisplayPart[] {
  return template.split(/(\{[^{}]+\})/gu).filter(Boolean).map(text => {
    const token = /^\{([^{}]+)\}$/u.exec(text);
    return token ? { text: slots[token[1]] ?? text, slot: token[1], kind: "fact" } : { text, kind: "template" };
  });
}

/** Emphasis follows the count tokens and their colon, not English wording or
 * a particular count. Unknown/custom structures retain their wording. */
export function emphasizeSkyDebilityCount(parts: readonly SkyDebilityDisplayPart[]): SkyDebilityDisplayPart[] {
  const start = parts.findIndex(part => part.slot === "countWord");
  const end = parts.findIndex((part, index) => index > start && part.slot === "planetList");
  if (start < 0 || end <= start) return [...parts];
  const countSlots = new Set(["countWord", "totalWord", "countVerb"]);
  const span = parts.slice(start, end);
  if ([...countSlots].some(slot => !span.some(part => part.slot === slot))
    || span.some(part => part.slot && !countSlots.has(part.slot))) return [...parts];
  const last = span.at(-1)!;
  const delimiter = /:\s*$/u.exec(last.text);
  if (last.slot || !delimiter) return [...parts];
  const prefix = span.slice(0, -1).map(part => ({ ...part, emphasized: true }));
  const finalText = last.text.slice(0, delimiter.index);
  if (finalText) prefix.push({ ...last, text: finalText, emphasized: true });
  return [...parts.slice(0, start), ...prefix, { ...last, text: delimiter[0] }, ...parts.slice(end)];
}

/** Reader and Studio share this presentation. Only the declared planetList
 * slot becomes links; every authored word and editor source is preserved. */
export function presentSkyDebilityParts(parts: readonly SkyDebilityDisplayPart[], links: readonly SkyDebilityPlacementLink[]): SkyDebilityDisplayPart[] {
  const highlighted = emphasizeSkyDebilityCount(parts);
  return highlighted.flatMap((part, index): SkyDebilityDisplayPart[] => {
    if (part.slot !== "planetList" || !links.length) return [part];
    if (highlighted[index - 1]?.slot === "planetList") return [];
    return links.flatMap((link, i) => [
      ...(i ? [{ text: ", ", slot: "planetList", kind: "grammar" as const }] : []),
      { ...link, slot: "planetList", kind: "fact" as const }
    ]);
  });
}
