import executableTemplateContract from "../content/templateHandoffV2/contracts/EXECUTABLE-TEMPLATE-CONTRACT.json";
import surfaceResolutionMatrix from "../content/templateHandoffV2/contracts/SURFACE-RESOLUTION-MATRIX.json";
import renderContractFixtures from "../content/templateHandoffV2/fixtures/render-contract-fixtures.json";
import ccSourcePhrases from "../content/templateHandoffV2/sources/cc-source-phrases.json";
import marieSourcePhrases from "../content/templateHandoffV2/sources/marie-source-phrases.json";
import sourceDerivedClauseExemplars from "../content/templateHandoffV2/sources/source-derived-clause-exemplars.json";

export type InventorySlotStatus = "calculated" | "ready" | "draft" | "local" | "missing";
export type InventorySlotEditableIn = "Calculated" | "Vocabulary" | "Fallback hooks";
export type InventorySlotRequirement = "required" | "optional" | "conditional" | "observed";
export type InventorySlotGroup =
  | "Calculated facts"
  | "Planet language"
  | "Zodiac language"
  | "House language"
  | "Angle language"
  | "Lunar language"
  | "Sky language"
  | "Aspect language"
  | "Relationship language"
  | "Transit language"
  | "Soul language"
  | "Career language"
  | "Template structure"
  | "Timing language";

export type PackageSlotInventoryRow = {
  slot: string;
  label: string;
  group: InventorySlotGroup;
  source: string;
  editableIn: InventorySlotEditableIn;
  status: InventorySlotStatus;
  description: string;
  examples?: string[];
  valueType?: string;
  requirement?: InventorySlotRequirement;
  templatesUsing?: string[];
  surfacesUsing?: string[];
  fallbackWhenMissing?: string;
  conditions?: string[];
  coverageCount?: number;
  unresolvedCount?: number;
  renderedPreview?: string;
};

export type PackagePhraseInventoryRow = {
  key: string;
  phrase: string;
  family: string;
  sourcePackage: string;
  sentenceFunction: string;
  surfaces: string[];
  slots: string[];
  usageCount: number;
  status: "ready" | "draft" | "local";
  provenance: string;
  preview: string;
};

export type PackageTemplateInventoryRow = {
  key: string;
  family: string;
  mode: string;
  version: string;
  requiredSlots: string[];
  optionalSlots: string[];
  clauseOrder: string[];
  constraints: string[];
  forbidden: string[];
  surfaces: string[];
  fixtureIds: string[];
  resolvedPreview: string;
  missingSlots: string[];
  fallbackPath: string;
};

export type PackageSurfaceInventoryRow = {
  surface: string;
  intent: string;
  templateFamily: string;
  requiredFacts: string[];
  optionalFacts: string[];
  primarySourcePattern: string;
  sourceGapWhen: string;
  fixtureIds: string[];
  finalPreview: string;
  missingCoverage: string[];
};

type AnyRecord = Record<string, any>;

const contract = executableTemplateContract as AnyRecord;
const matrix = surfaceResolutionMatrix as AnyRecord;
const fixtures = (renderContractFixtures as AnyRecord).fixtures as AnyRecord[];
const exemplars = (sourceDerivedClauseExemplars as AnyRecord).records as AnyRecord[];

function uniq(values: Array<string | null | undefined>, limit = 999) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].slice(0, limit);
}

function words(value: string) {
  return value
    .replace(/[_./-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function extractMustacheSlots(value: unknown) {
  const slots = new Set<string>();
  if (typeof value !== "string") return [];
  const pattern = /{{[#/]?\s*([a-zA-Z0-9_.-]+)\s*}}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    slots.add(`{{${match[1]}}}`);
  }
  return [...slots];
}

function walkStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(walkStrings);
  if (value && typeof value === "object") return Object.values(value as AnyRecord).flatMap(walkStrings);
  return [];
}

function slotToken(slot: string) {
  return slot.replace(/[{}]/g, "");
}

function classifySlotGroup(slot: string): InventorySlotGroup {
  const token = slotToken(slot).toLowerCase();
  if (token.includes("planet") || token.includes("point") || token.includes("ruler") || token.includes("body")) return "Planet language";
  if (token.includes("sign") || token.includes("zodiac")) return "Zodiac language";
  if (token.includes("house")) return "House language";
  if (token.includes("angle") || token.includes("asc") || token.includes("mc")) return "Angle language";
  if (token.includes("moon") || token.includes("lunar") || token.includes("phase")) return "Lunar language";
  if (token.includes("aspect") || token.includes("orb")) return "Aspect language";
  if (token.includes("person") || token.includes("relationship") || token.includes("partner")) return "Relationship language";
  if (token.includes("transit") || token.includes("timing") || token.includes("window") || token.includes("exact")) return "Transit language";
  if (token.includes("purpose") || token.includes("node")) return "Soul language";
  if (token.includes("career") || token.includes("work") || token.includes("mc")) return "Career language";
  if (token.includes("template") || token.includes("section") || token.includes("headline")) return "Template structure";
  if (token.includes("date") || token.includes("period") || token.includes("duration")) return "Timing language";
  return "Calculated facts";
}

function editableForSlot(slot: string): InventorySlotEditableIn {
  const token = slotToken(slot).toLowerCase();
  if (token.includes("clause") || token.includes("phrase") || token.includes("topic") || token.includes("texture") || token.includes("scene")) return "Vocabulary";
  if (token.includes("headline") || token.includes("template") || token.includes("fallback")) return "Fallback hooks";
  return "Calculated";
}

function valueTypeForSlot(slot: string) {
  const token = slotToken(slot).toLowerCase();
  if (token.includes("date")) return "date";
  if (token.includes("house")) return "house ordinal/topic";
  if (token.includes("sign")) return "zodiac sign";
  if (token.includes("planet") || token.includes("point")) return "planet or chart point";
  if (token.includes("clause") || token.includes("phrase") || token.includes("scene")) return "reader-facing phrase";
  return "text";
}

function phraseFamily(key: string) {
  const parts = key.split("/");
  if (parts[0] === "cc" || parts[0] === "ms") return parts.slice(1, 3).join("/");
  return parts.slice(0, 2).join("/");
}

function sentenceFunctionForKey(key: string) {
  if (/scene|lived|behavior|situation/.test(key)) return "scene";
  if (/practice|action|response|advice/.test(key)) return "practice";
  if (/topic|theme|focus/.test(key)) return "topic";
  if (/shadow|risk|cost|challenge/.test(key)) return "challenge";
  if (/gift|growth|support/.test(key)) return "growth";
  return "phrase";
}

function phraseRowsFromSource(source: AnyRecord, sourcePackage: string): PackagePhraseInventoryRow[] {
  return Object.entries(source).map(([key, rawValue]) => {
    const phrase = String(rawValue ?? "");
    const relatedExemplars = exemplars.filter((record) => Object.values(record.source_keys ?? {}).includes(key));
    const surfaces = uniq(relatedExemplars.map((record) => record.surface), 12);
    return {
      key,
      phrase,
      family: phraseFamily(key),
      sourcePackage,
      sentenceFunction: sentenceFunctionForKey(key),
      surfaces,
      slots: extractMustacheSlots(phrase),
      usageCount: relatedExemplars.length,
      status: "ready",
      provenance: sourcePackage,
      preview: phrase.length > 180 ? `${phrase.slice(0, 180)}...` : phrase
    };
  });
}

function buildTemplateRows(): PackageTemplateInventoryRow[] {
  const version = String(contract.version ?? "template-contract");
  const families = contract.families ?? {};
  return Object.entries(families).flatMap(([family, familyValue]) => {
    const modes = Object.entries(familyValue as AnyRecord).filter(([, value]) => value && typeof value === "object");
    return modes.map(([mode, modeValue]) => {
      const row = modeValue as AnyRecord;
      const strings = walkStrings(row);
      const requiredSlots = uniq([...(row.required ?? []), ...strings.flatMap(extractMustacheSlots)].map((slot) => slot.startsWith("{{") ? slot : `{{${slot}}}`));
      const optionalSlots = uniq((row.optional ?? []).map((slot: string) => slot.startsWith("{{") ? slot : `{{${slot}}}`));
      const relatedSurfaces = ((matrix.surfaces ?? []) as AnyRecord[]).filter((surface) => surface.templateFamily === family);
      const relatedFixtures = fixtures.filter((fixture) => fixture.templateFamily === family && (!fixture.mode || fixture.mode === mode));
      return {
        key: `${family}.${mode}`,
        family,
        mode,
        version,
        requiredSlots,
        optionalSlots,
        clauseOrder: uniq([...(row.order ?? []), ...(row.clauses ?? [])].map(String), 24),
        constraints: uniq(walkStrings(row.constraints ?? []), 12),
        forbidden: uniq(walkStrings(row.forbidden ?? []), 12),
        surfaces: uniq(relatedSurfaces.map((surface) => surface.surface), 20),
        fixtureIds: uniq(relatedFixtures.map((fixture) => fixture.id), 20),
        resolvedPreview: walkStrings(relatedFixtures[0]?.renderedFields ?? relatedFixtures[0] ?? {}).join(" ").slice(0, 320),
        missingSlots: [],
        fallbackPath: `${family} -> fallback hook -> emergency floor`
      };
    });
  });
}

function buildSurfaceRows(): PackageSurfaceInventoryRow[] {
  return ((matrix.surfaces ?? []) as AnyRecord[]).map((surface) => {
    const relatedFixtures = fixtures.filter((fixture) => fixture.surface === surface.surface);
    const finalPreview = walkStrings(relatedFixtures[0]?.renderedFields ?? relatedFixtures[0] ?? {}).join(" ").slice(0, 320);
    return {
      surface: String(surface.surface ?? "unknown"),
      intent: String(surface.intent ?? ""),
      templateFamily: String(surface.templateFamily ?? ""),
      requiredFacts: (surface.requiredFacts ?? []).map(String),
      optionalFacts: (surface.optionalFacts ?? []).map(String),
      primarySourcePattern: String(surface.primarySourcePattern ?? ""),
      sourceGapWhen: String(surface.sourceGapWhen ?? ""),
      fixtureIds: uniq(relatedFixtures.map((fixture) => fixture.id), 12),
      finalPreview,
      missingCoverage: (surface.sourceGapWhen ? [String(surface.sourceGapWhen)] : [])
    };
  });
}

const templateRows = buildTemplateRows();
const surfaceRows = buildSurfaceRows();
export const packagePhraseInventoryRows: PackagePhraseInventoryRow[] = [
  ...phraseRowsFromSource(ccSourcePhrases as AnyRecord, "cc-source-phrases.json"),
  ...phraseRowsFromSource(marieSourcePhrases as AnyRecord, "marie-source-phrases.json")
].sort((first, second) => first.family.localeCompare(second.family) || first.key.localeCompare(second.key));

export const packageTemplateInventoryRows = templateRows;
export const packageSurfaceInventoryRows = surfaceRows;

export const packageSlotInventoryRows: PackageSlotInventoryRow[] = (() => {
  const rows = new Map<string, PackageSlotInventoryRow>();
  const touch = (slot: string, patch: Partial<PackageSlotInventoryRow>) => {
    const normalized = slot.startsWith("{{") ? slot : `{{${slot}}}`;
    const existing = rows.get(normalized);
    const merged: PackageSlotInventoryRow = {
      slot: normalized,
      label: words(slotToken(normalized)),
      group: classifySlotGroup(normalized),
      source: editableForSlot(normalized) === "Calculated" ? "Runtime calculated context" : "Normalized phrasebank package",
      editableIn: editableForSlot(normalized),
      status: editableForSlot(normalized) === "Calculated" ? "calculated" : "ready",
      description: "Editorial dependency used by one or more reader surfaces.",
      examples: [],
      valueType: valueTypeForSlot(normalized),
      requirement: "observed",
      templatesUsing: [],
      surfacesUsing: [],
      coverageCount: 0,
      unresolvedCount: 0,
      ...existing
    };
    rows.set(normalized, {
      ...merged,
      ...patch,
      examples: uniq([...(merged.examples ?? []), ...(patch.examples ?? [])], 8),
      templatesUsing: uniq([...(merged.templatesUsing ?? []), ...(patch.templatesUsing ?? [])], 20),
      surfacesUsing: uniq([...(merged.surfacesUsing ?? []), ...(patch.surfacesUsing ?? [])], 20),
      conditions: uniq([...(merged.conditions ?? []), ...(patch.conditions ?? [])], 12),
      coverageCount: (merged.coverageCount ?? 0) + (patch.coverageCount ?? 0),
      unresolvedCount: (merged.unresolvedCount ?? 0) + (patch.unresolvedCount ?? 0)
    });
  };

  templateRows.forEach((template) => {
    template.requiredSlots.forEach((slot) => touch(slot, {
      requirement: "required",
      templatesUsing: [template.key],
      surfacesUsing: template.surfaces,
      renderedPreview: template.resolvedPreview,
      coverageCount: template.fixtureIds.length
    }));
    template.optionalSlots.forEach((slot) => touch(slot, {
      requirement: "optional",
      templatesUsing: [template.key],
      surfacesUsing: template.surfaces,
      coverageCount: template.fixtureIds.length
    }));
  });

  surfaceRows.forEach((surface) => {
    [...surface.requiredFacts, ...surface.optionalFacts].forEach((fact) => touch(`{{${fact}}}`, {
      requirement: surface.requiredFacts.includes(fact) ? "required" : "optional",
      surfacesUsing: [surface.surface],
      templatesUsing: [surface.templateFamily],
      fallbackWhenMissing: surface.sourceGapWhen,
      renderedPreview: surface.finalPreview,
      coverageCount: surface.fixtureIds.length,
      unresolvedCount: surface.missingCoverage.length
    }));
  });

  fixtures.forEach((fixture) => {
    Object.keys(fixture.facts ?? {}).forEach((fact) => touch(`{{${fact}}}`, {
      requirement: "observed",
      examples: [String(fixture.facts[fact])],
      surfacesUsing: [fixture.surface],
      templatesUsing: [fixture.templateFamily],
      coverageCount: 1
    }));
  });

  exemplars.forEach((record) => {
    Object.entries(record.slots ?? {}).forEach(([slot, value]) => touch(`{{${slot}}}`, {
      examples: [String(value)],
      surfacesUsing: [record.surface],
      coverageCount: 1
    }));
  });

  return [...rows.values()].sort((first, second) => first.group.localeCompare(second.group) || first.slot.localeCompare(second.slot));
})();

export const contentSystemInventorySummary = {
  slots: packageSlotInventoryRows.length,
  vocabularyPhrases: packagePhraseInventoryRows.length,
  templates: packageTemplateInventoryRows.length,
  surfaces: packageSurfaceInventoryRows.length,
  requiredSlots: packageSlotInventoryRows.filter((row) => row.requirement === "required").length,
  unresolvedSlots: packageSlotInventoryRows.filter((row) => (row.unresolvedCount ?? 0) > 0 || row.status === "missing").length
};
