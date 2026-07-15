export type ServedFieldSurface = "natal" | "sky" | "horoscope";

type ServedFieldSpec = {
  reader?: string[];
  readerBySurface?: Partial<Record<ServedFieldSurface, string[]>>;
  footer?: string | null;
  extras?: string[];
};

export const servedFieldsContract: Record<string, ServedFieldSpec> = {
  "cc-natal-aspect": {
    reader: ["experience", "guidance", "note"],
    footer: "astro"
  },
  "cc-aspect-pair-reviewed": {
    reader: ["expanded_narrative"],
    extras: ["pull_quote.text", "marie_advice.text"]
  },
  "cc-planet-in-sign-reviewed": {
    readerBySurface: {
      natal: ["natal_sign_story"],
      sky: ["collective_shift"]
    }
  },
  "cc-planet-in-house-reviewed": {
    readerBySurface: {
      natal: ["house_integration"],
      horoscope: ["home_scene"]
    }
  },
  "cc-composite-typed": {
    reader: ["meaning", "experience", "advice"],
    footer: "astro"
  },
  "cc-composite-aspect": {
    reader: ["experience", "guidance", "note"],
    footer: "astro"
  },
  "cc-natal-angles-authored": {
    reader: ["reading"]
  },
  "cc-sky-points-authored": {
    reader: ["collective_reading"]
  }
};

export const servedFieldLabels: Record<string, string> = {
  advice: "What helps",
  experience: "How it works",
  guidance: "What to do",
  meaning: "What it is",
  note: "Note",
  reading: ""
};

export const servedFieldInternalBlacklist = new Set([
  "angle",
  "aspect",
  "astro",
  "body",
  "canonical_aspect",
  "compose_note",
  "doctrine_source",
  "eyebrow",
  "fields",
  "house",
  "house_domain",
  "id",
  "kind",
  "originalityCheck",
  "pair",
  "recommended_long_template",
  "recommended_short_template",
  "relationshipType",
  "requires_birth_time",
  "review_note",
  "revoice_version",
  "sign",
  "slots",
  "source_keys",
  "status",
  "surface",
  "surfaces",
  "template_family",
  "their_body",
  "title",
  "tone_version",
  "trace",
  "typeLabel",
  "valence",
  "your_body"
]);

export const noProseSourceFiles = new Set([
  "cc-natal-angle-reviewed",
  "cc-planetary-horoscope",
  "cc-composite-reviewed",
  "cc-synastry-reviewed"
]);

export const servedFieldInstructionMarkers = [
  "entries are ordered",
  "do not apply",
  "factual context when no reviewed",
  "needs Marie",
  "needs editorial",
  "decomposed to slots",
  "prohibited seams cleared",
  "combine with ms/",
  "recommended_",
  "template_family",
  "revoice_version",
  "tone_version"
];
