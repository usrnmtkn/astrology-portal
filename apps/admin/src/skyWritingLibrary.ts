export type SkyWritingLibrarySourceKind = "planet" | "sign" | "placement" | "timing" | "aspect";

export type SkyWritingLibrarySource = {
  kind: SkyWritingLibrarySourceKind | string;
  text?: string;
  reference?: { contentKey: string; field: string; sha256: string };
};

export type SkyWritingLibraryModule = {
  id: string;
  label: string;
  template: string;
  enabled: boolean;
  required: boolean;
  motion: string;
  duration: string;
  timing: string;
  aspect?: { otherPlanet: string; type: string; weight: string };
};

export type SkyWritingLibraryComposition = {
  version: number;
  enabled: boolean;
  sources: Record<string, SkyWritingLibrarySource>;
  modules: SkyWritingLibraryModule[];
};

export type SkyWritingLibraryField = {
  id: string;
  label: string;
  description: string;
  kind: SkyWritingLibrarySourceKind;
  rows?: number;
  shared?: boolean;
};

export type SkyWritingLibraryGroup = {
  id: string;
  label: string;
  description: string;
  fields: SkyWritingLibraryField[];
};

type RecordValue = Record<string, any>;
type SourceLoader = (key: string) => Promise<RecordValue | undefined>;

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const firstText = (...values: unknown[]) => values.map(text).find(Boolean) ?? "";

// @ts-ignore Shared registry keeps the picker and reader validator in sync.
import { SKY_WRITING_LIBRARY_GROUPS as sharedGroups } from "../../web/src/content/fallbackArchitectureV3/resolver/skyWritingLibraryRegistry.mjs";
export const SKY_WRITING_LIBRARY_GROUPS = sharedGroups as SkyWritingLibraryGroup[];

const module = (id: string, label: string, template: string, required = false): SkyWritingLibraryModule => ({
  id,
  label,
  template,
  enabled: true,
  required,
  motion: "all",
  duration: "all",
  timing: "all"
});

// Only complete, already-existing placement sentences are assembled by default.
// Planet and sign vocabulary remains editable source material until an editor
// deliberately inserts it into a section; noun phrases are never dumped into
// reader prose as standalone paragraphs.
export const SKY_WRITING_LIBRARY_MODULES: SkyWritingLibraryModule[] = [
  module("library-opening", "Planet in sign", "From {{entryDate}} to {{exitDate}}, {{planetTitle}} moves through {{signTitle}}. {{planetTitle}} describes {{planetFunction}}, while {{signTitle}} pursues {{signCoreDrive}} through {{signMethod}}. {{placementThesis}}", true),
  module("library-dignity", "Dignity", "{{placementDignityMeaning}}"),
  module("library-experience", "Lived experience", "{{experienceGeneral}} {{placementOpportunity}}", true),
  module("library-challenge", "The challenge", "The challenge\n\n{{placementPressure}}", true),
  module("library-response", "Response and close", "{{responseSentence}} {{practiceClosingLine}}", true)
];

export const SKY_WRITING_LIBRARY_FIELD_IDS = SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields.map(item => item.id));
const librarySentinels = ["planetFunction", "signMethod", "placementThesis", "experienceGeneral", "planetSummary", "signSummary"];

export function skyWritingLibraryInstalled(composition?: SkyWritingLibraryComposition | null) {
  return Boolean(composition && librarySentinels.some(id => Object.hasOwn(composition.sources, id)));
}

function recordSeedValues(source: RecordValue = {}) {
  const fallback = source.fallback && typeof source.fallback === "object" ? source.fallback : {};
  return {
    placementThesis: firstText(source.tldrWhat, source.TLDRWhat, source.TLDR_What),
    placementPressure: firstText(fallback.lived, source.fallbackLived),
    placementCorrection: firstText(fallback.turn, source.fallbackTurn),
    experienceGeneral: firstText(fallback.lived, source.fallbackLived),
    openingHook: firstText(fallback.hook, source.fallbackHook),
    closingLine: firstText(source.tldrTakeaway, source.TLDRTakeaway, source.TLDR_Takeaway, source.summary)
  };
}

const sharedSeedSpecs = (planet: string, sign: string) => [
  { id: "planetProductive", keys: [`fallback-vocab/planet-productive/${planet}`] },
  { id: "planetShadow", keys: [`fallback-vocab/planet-excess/${planet}`] },
  { id: "signGift", keys: [`fallback-vocab/sign-does/${sign}`] },
  { id: "signShadow", keys: [`fallback-hook/sky-sign-trap/${sign}`] }
];

function sourceBody(source?: RecordValue) {
  if (!source) return "";
  const review = firstText(source.review_status, source.reviewStatus).toLowerCase();
  if (review && review !== "approved") return "";
  if (source.owner_approved === false || source.ownerApproved === false) return "";
  return firstText(source.body, source.body_you, source.Body, source.Copy, source.Template, source.summary);
}

export async function loadSkyWritingLibrarySeeds(source: RecordValue, planet: string, sign: string, onLoadSource?: SourceLoader) {
  const values: Record<string, string> = recordSeedValues(source);
  const provenance: Record<string, string> = {};
  for (const [id, value] of Object.entries(values)) if (value) provenance[id] = `${source.contentKey ?? "placement"}#existing-copy`;
  if (!onLoadSource) return { values, provenance };

  await Promise.all(sharedSeedSpecs(planet, sign).map(async spec => {
    for (const key of spec.keys) {
      try {
        const loaded = await onLoadSource(key);
        const body = sourceBody(loaded);
        if (!body) continue;
        values[spec.id] = body;
        provenance[spec.id] = `${key}#body`;
        break;
      } catch {
        // A missing optional seed source must never block editing the placement.
      }
    }
  }));
  return { values, provenance };
}

export function installSkyWritingLibrary(composition: SkyWritingLibraryComposition, seeds: Record<string, string> = {}): SkyWritingLibraryComposition {
  const next = structuredClone(composition);

  // Preserve existing drafts while moving unclear legacy names behind the new,
  // reader-friendly field vocabulary. Legacy keys remain untouched for rollback.
  const legacyPlanetDescriptor = next.sources.planetAppositive;
  if (!next.sources.planetDescriptor && legacyPlanetDescriptor) next.sources.planetDescriptor = structuredClone(legacyPlanetDescriptor);
  const legacySignDescriptor = next.sources.signAppositive;
  if (!next.sources.signDescriptor && legacySignDescriptor) next.sources.signDescriptor = structuredClone(legacySignDescriptor);
  const legacyPlanetLore = next.sources.mythologySummary;
  if (!next.sources.planetLore && legacyPlanetLore) next.sources.planetLore = structuredClone(legacyPlanetLore);

  for (const group of SKY_WRITING_LIBRARY_GROUPS) {
    for (const item of group.fields) {
      if (item.shared) continue;
      const seed = text(seeds[item.id]);
      const existing = next.sources[item.id];
      if (!existing) next.sources[item.id] = { kind: item.kind, text: seed };
      else if (!existing.reference && !text(existing.text) && seed) next.sources[item.id] = { ...existing, text: seed };
    }
  }
  const moduleIds = new Set(next.modules.map(item => item.id));
  for (const item of SKY_WRITING_LIBRARY_MODULES) {
    if (!moduleIds.has(item.id) && next.modules.length < 32) next.modules.push(structuredClone(item));
  }
  return next;
}

export function skyWritingLibrarySourceModuleId(sourceId: string) {
  return `library-source-${sourceId}`;
}

export function skyWritingLibrarySourceModuleEnabled(composition: SkyWritingLibraryComposition, sourceId: string) {
  return composition.modules.some(item => item.id === skyWritingLibrarySourceModuleId(sourceId) && item.enabled);
}

export function toggleSkyWritingLibrarySourceModule(composition: SkyWritingLibraryComposition, sourceId: string, label: string): SkyWritingLibraryComposition {
  const id = skyWritingLibrarySourceModuleId(sourceId);
  if (composition.modules.some(item => item.id === id)) return { ...composition, modules: composition.modules.filter(item => item.id !== id) };
  if (composition.modules.length >= 32) return composition;
  const next = module(id, `Experience · ${label}`, `{{${sourceId}}}`);
  const before = composition.modules.findIndex(item => item.id === "library-challenge");
  const modules = [...composition.modules];
  modules.splice(before >= 0 ? before : modules.length, 0, next);
  return { ...composition, modules };
}

const legacyBodyModuleIds = new Set(["opening", "practice", "manifestations", "third-manifestation", "response", "intro-mechanism", "intro-close", "close"]);
const timingModuleIds = new Set(["single-pass", "first-pass", "return", "final-pass", "long-cycle"]);
const primaryLibraryModuleIds = new Set(["library-opening", "library-experience", "library-challenge", "library-response"]);
const libraryOrder = SKY_WRITING_LIBRARY_MODULES.map(item => item.id);

export function preferSkyWritingLibrary(composition: SkyWritingLibraryComposition): SkyWritingLibraryComposition {
  const installed = installSkyWritingLibrary(composition);
  const prepared = installed.modules.map(item => legacyBodyModuleIds.has(item.id)
    ? { ...item, enabled: false, required: false }
    : primaryLibraryModuleIds.has(item.id)
      ? { ...item, enabled: true, required: true }
      : item);
  const byId = new Map(prepared.map(item => [item.id, item]));
  const pick = (...ids: string[]) => ids.map(id => byId.get(id)).filter((item): item is SkyWritingLibraryModule => Boolean(item));
  const selectedExperiences = prepared.filter(item => item.id.startsWith("library-source-experience"));
  const timing = prepared.filter(item => timingModuleIds.has(item.id));
  const structural = prepared.filter(item => !legacyBodyModuleIds.has(item.id)
    && !timingModuleIds.has(item.id)
    && !libraryOrder.includes(item.id)
    && !item.id.startsWith("library-source-experience"));
  return {
    ...installed,
    modules: [
      ...structural,
      ...pick("library-opening", "library-dignity"),
      ...selectedExperiences,
      ...pick("library-experience"),
      ...timing,
      ...pick("library-challenge", "library-response")
    ]
  };
}

export function skyWritingLibraryIsPrimary(composition?: SkyWritingLibraryComposition | null) {
  if (!composition) return false;
  return [...primaryLibraryModuleIds].every(id => composition.modules.some(item => item.id === id && item.enabled && item.required));
}
