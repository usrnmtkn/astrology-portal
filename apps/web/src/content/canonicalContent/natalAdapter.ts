import type { AspectFacts } from "../fallbackArchitectureV3Runtime";

export const CANONICAL_NATAL_CONTENT_FLAG = "VITE_CANONICAL_CONTENT_HUB_NATAL";

type LegacyRender = {
  headline: string;
  body: string;
  parts: string[];
  templateKey?: string;
  partKeys?: string[];
  sourceKeys?: string[];
  note?: string | null;
  canonicalResolutionMode?: "authored" | "composed" | "gap";
};

type LegacyNatalRenderer = {
  renderNatalPlacement(facts: {
    planet: string;
    sign: string;
    house?: number;
    voice?: string;
    dignity?: string;
    isRetrograde?: boolean;
    sect?: { hasReliableSect?: boolean };
  }, options?: unknown): LegacyRender;
  renderNatalAspect(facts: AspectFacts, options?: unknown): LegacyRender;
  renderNatalEmptyHouse(facts: { house: number; sign: string; primaryRuler?: string; rulerHouse?: number; rulerSystem?: string; voice?: string }, options?: unknown): LegacyRender;
};

type CanonicalResolution = {
  identity: { unitId: string };
  resolution: {
    mode: "authored" | "composed" | "gap";
    canonicalRevisionId: string | null;
    perspectiveModes?: Record<"you" | "they", "authored" | "composed" | "gap">;
  };
  content: { byPerspective: Record<string, { headline: string; body: string; parts: string[]; variants?: Record<string, { headline: string; body: string; parts: string[] }> }> };
  result: { status: string; renderEligible: boolean };
};

type CanonicalLookup = (
  unitId: string,
  options: { surface: "natal"; register: "natal"; perspective: "you" | "they" }
) => CanonicalResolution | null;

const BODY_ALIASES: Record<string, string> = {
  "true-node": "north-node"
};

const ASPECT_ALIASES: Record<string, string> = {
  conj: "conjunction",
  conjunct: "conjunction",
  inconjunct: "quincunx",
  opposed: "opposition",
  opposite: "opposition",
  sext: "sextile",
  sq: "square"
};

function segment(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[_\s]+/gu, "-");
}

function body(value: unknown) {
  const normalized = segment(value);
  return BODY_ALIASES[normalized] ?? normalized;
}

function aspect(value: unknown) {
  const normalized = segment(value);
  return ASPECT_ALIASES[normalized] ?? normalized;
}

function unordered(first: string, second: string) {
  return [body(first), body(second)].sort((a, b) => a.localeCompare(b));
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function perspectiveForVoice(voice?: string): "you" | "they" {
  return voice === "you" || !voice ? "you" : "they";
}

function substituteName(value: string, voice?: string) {
  return value.replaceAll("{{Name}}", voice && voice !== "you" ? voice : "they");
}

function read(lookup: CanonicalLookup, unitId: string, voice?: string, variant?: string) {
  const perspective = perspectiveForVoice(voice);
  const unit = lookup(unitId, { surface: "natal", register: "natal", perspective });
  const baseContent = unit?.content.byPerspective?.[perspective];
  const content = variant && baseContent?.variants?.[variant] ? baseContent.variants[variant] : baseContent;
  if (!unit || unit.result.status !== "RESOLVED" || !unit.result.renderEligible || !content) {
    throw new Error(`SOURCE_GAP: canonical content unit ${unitId}`);
  }
  return {
    headline: substituteName(content.headline, voice),
    body: substituteName(content.body, voice),
    parts: content.parts.map((part) => substituteName(part, voice)),
    templateKey: unitId,
    canonicalResolutionMode: unit.resolution.perspectiveModes?.[perspective] ?? unit.resolution.mode
  };
}

export function canonicalNatalContentEnabled(
  environment: Record<string, string | boolean | undefined> = import.meta.env ?? {}
) {
  return environment[CANONICAL_NATAL_CONTENT_FLAG] === "1"
    || environment[CANONICAL_NATAL_CONTENT_FLAG] === "true";
}

export function createCanonicalNatalAdapter({
  enabled = canonicalNatalContentEnabled(),
  getCanonicalUnit,
  legacyRenderer
}: {
  enabled?: boolean;
  getCanonicalUnit: CanonicalLookup;
  legacyRenderer: LegacyNatalRenderer;
}): LegacyNatalRenderer {
  if (!enabled) return legacyRenderer;

  return {
    renderNatalPlacement(facts, options) {
      void options;
      if (facts.dignity || facts.isRetrograde || facts.sect?.hasReliableSect) {
        throw new Error("SOURCE_GAP: canonical natal modifier overlays are outside Wave 1");
      }
      const signUnit = read(
        getCanonicalUnit,
        `natal/placement-sign/${body(facts.planet)}/${segment(facts.sign)}`,
        facts.voice
      );
      if (!facts.house) return signUnit;
      const houseUnit = read(
        getCanonicalUnit,
        `natal/placement-house/${body(facts.planet)}/${facts.house}`,
        facts.voice
      );
      const parts = [...signUnit.parts, ...houseUnit.parts];
      return {
        headline: houseUnit.canonicalResolutionMode === "authored"
          ? houseUnit.headline
          : `${signUnit.headline} in the ${ordinal(facts.house)} house`,
        body: parts.join("\n\n"),
        parts,
        partKeys: [signUnit.templateKey, houseUnit.templateKey],
        templateKey: houseUnit.templateKey
      };
    },
    renderNatalAspect(facts, options) {
      void options;
      const pair = unordered(facts.planetA, facts.planetB);
      return read(getCanonicalUnit, `natal/aspect/${pair[0]}/${pair[1]}/${aspect(facts.aspect)}`, facts.voice);
    },
    renderNatalEmptyHouse(facts, options) {
      const includeBridge = Boolean((options as { includeEmptyHouseBridge?: boolean } | undefined)?.includeEmptyHouseBridge);
      const ruler = body(facts.primaryRuler);
      const unit = read(
        getCanonicalUnit,
        `natal/empty-house/${facts.house}/${segment(facts.sign)}/${ruler}-in-${facts.rulerHouse}`,
        facts.voice,
        includeBridge ? "detail" : "card"
      );
      return { ...unit, sourceKeys: [unit.templateKey ?? ""], note: null };
    }
  };
}
