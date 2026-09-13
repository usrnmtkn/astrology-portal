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
};

export type SkyWritingLibraryGroup = {
  id: string;
  label: string;
  description: string;
  fields: SkyWritingLibraryField[];
};

type RecordValue = Record<string, any>;
type SourceLoader = (key: string) => Promise<RecordValue | undefined>;

const field = (id: string, label: string, description: string, kind: SkyWritingLibrarySourceKind, rows = 4): SkyWritingLibraryField => ({ id, label, description, kind, rows });
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const firstText = (...values: unknown[]) => values.map(text).find(Boolean) ?? "";

export const SKY_WRITING_LIBRARY_GROUPS: SkyWritingLibraryGroup[] = [
  {
    id: "planet",
    label: "Planet language",
    description: "Reusable planet language with one clear job per field. Descriptor is a phrase; function is the planet's lived meaning. Mythology lives separately under Planet lore / mythology.",
    fields: [
      field("planetDescriptor", "Planet descriptor", "A short identifying phrase used inside another sentence. Example: ‘the planet of love, pleasure, and values’ in ‘Venus, the planet of love, pleasure, and values, describes how we relate and what we enjoy.’", "planet", 2),
      field("planetFunction", "Planet function", "What the planet represents in lived terms: the activity, need, or process it describes. This is the reusable meaning field and should not repeat the descriptor or mythology.", "planet", 4),
      field("planetProductive", "Productive expression", "How this planet can operate constructively when its function has somewhere useful to go.", "planet", 4),
      field("planetShadow", "Planet shadow / excess", "What can happen when the same planetary function gets overused, distorted, or pushed too far.", "planet", 4),
      field("planetCollectiveExpression", "Collective expression", "Optional larger cultural or collective expression. Author it only when it belongs to the exact article argument.", "planet", 4)
    ]
  },
  {
    id: "sign",
    label: "Zodiac sign language",
    description: "Reusable sign language with distinct jobs. Descriptor is a phrase; core drive says what the sign wants; method says how it tends to go about it.",
    fields: [
      field("signDescriptor", "Sign descriptor", "A short identifying phrase used inside another sentence. Example: ‘a cardinal fire sign’ in ‘Aries, a cardinal fire sign, tends to move toward what needs to begin.’", "sign", 2),
      field("signCoreDrive", "Core drive", "What the sign needs or keeps trying to establish.", "sign", 4),
      field("signMethod", "Method", "How the sign tends to approach problems, choices, change, or expression.", "sign", 4),
      field("signGift", "Gift", "What the sign tends to do constructively when its method is working.", "sign", 4),
      field("signShadow", "Sign shadow", "Where the sign’s method can become rigid, excessive, avoidant, or counterproductive.", "sign", 4),
      field("signValues", "Values and life themes", "Optional sign themes. This stays empty by default rather than importing a house-shaped list.", "sign", 4)
    ]
  },
  {
    id: "placement",
    label: "Planet × sign synthesis",
    description: "The exact planet-in-sign layer. Existing approved TLDR and fallback copy prefill fields only when there is a clean one-to-one source; the rest stay empty rather than being invented.",
    fields: [
      field("placementThesis", "Placement thesis", "The central argument for this exact planet in this exact sign. Prefilled from the existing TLDR What when available.", "placement", 4),
      field("placementOpportunity", "Opportunity", "What may become easier, more available, or more worth developing. Author this only when it is distinct from the existing takeaway.", "placement", 4),
      field("placementPressure", "How it shows up", "Recognizable behavior or consequence. Prefilled from the existing fallback lived passage when available.", "placement", 4),
      field("placementShadow", "Placement shadow", "The specific failure mode created by this planet and sign together. Left empty unless the current approved source isolates it cleanly.", "placement", 4),
      field("placementCorrection", "Challenge and response", "The useful turn already established by the placement. Prefilled from the existing fallback challenge/response passage when available.", "placement", 4),
      field("placementPractice", "Practice", "Optional additional concrete ways to work with the placement. Do not duplicate the challenge/response field.", "placement", 4),
      field("placementCollectiveTheme", "Collective theme", "Optional larger social or cultural expression of this exact placement.", "placement", 4),
      field("placementCollectiveShadow", "Collective shadow", "Optional larger social or cultural excess or consequence of this exact placement.", "placement", 4)
    ]
  },
  {
    id: "experiences",
    label: "Experience hooks",
    description: "A bank of plausible manifestations. General preserves the existing lived passage; add broader life-area hooks only when they genuinely fit the placement.",
    fields: [
      field("experienceGeneral", "General", "Existing approved lived manifestation for this placement. Prefilled when one exists.", "placement", 3),
      field("experienceWork", "Work", "Workload, responsibility, leadership, deadlines, colleagues, or the structure of a workday.", "placement", 3),
      field("experienceMoney", "Money", "Income, spending, pricing, resources, financial choices, or material support.", "placement", 3),
      field("experienceRelationships", "Relationships", "Close connections, agreements, reciprocity, conflict, support, or intimacy.", "placement", 3),
      field("experienceHome", "Home", "Living situation, family, roots, privacy, belonging, or domestic responsibilities.", "placement", 3),
      field("experienceBody", "Body", "Energy, pace, rest, appetite, physical cues, appearance, or sensory experience without making medical claims.", "placement", 3),
      field("experienceTime", "Time", "Scheduling, waiting, urgency, delays, attention, bandwidth, or what is taking too much of the day.", "placement", 3),
      field("experienceRecognition", "Recognition", "Visibility, credit, reputation, audience, praise, authority, or being taken seriously.", "placement", 3),
      field("experienceCreative", "Creativity", "Art, play, hobbies, self-expression, experimentation, pleasure, or making something visible.", "placement", 3)
    ]
  },
  {
    id: "hooks",
    label: "Hooks and takeaways",
    description: "Reader-facing openings and closes. Existing approved fallback and TLDR copy prefill the fields that already have exact source wording.",
    fields: [
      field("openingHook", "Opening hook", "Prefilled from the existing fallback opening when available.", "placement", 4),
      field("reflectionQuestion", "Reflection question", "Optional question that deepens the article. Left empty rather than generating a generic journal prompt.", "placement", 3),
      field("closingLine", "Closing line", "Prefilled from the existing TLDR Takeaway when available.", "placement", 3)
    ]
  },
  {
    id: "context",
    label: "Optional context blocks",
    description: "Background context that is different from the planet's everyday function. Use only when the article benefits from it.",
    fields: [
      field("planetLore", "Planet lore / mythology", "Mythic, historical, or symbolic background attached to the planet. Example: a concise account of the deity or story associated with the planet and why that symbolism matters here.", "planet", 5),
      field("astronomySummary", "Astronomy summary", "A concise factual explanation for unusual astronomical bodies or cycles when useful.", "planet", 5),
      field("historicalCallback", "Previous-cycle / historical callback", "Context from a prior comparable residency or cycle. Calculated dates still come from fact variables.", "placement", 5),
      field("returnMeaning", "Return meaning", "Reusable meaning for a supported return story when applicable.", "planet", 5)
    ]
  },
  {
    id: "aspects",
    label: "Aspect writing",
    description: "The defining-aspect sentence sources. They stay empty until a specific calculated aspect has been chosen and authored.",
    fields: [
      field("aspectMechanismSentence", "Aspect mechanism", "What the two bodies and aspect are doing together.", "aspect", 4),
      field("aspectManifestationSentence1", "Aspect manifestation 1", "One plausible lived or collective expression of the aspect.", "aspect", 4),
      field("aspectManifestationSentence2", "Aspect manifestation 2", "A second manifestation that broadens the first instead of repeating it.", "aspect", 4),
      field("aspectChallengeSentence", "Aspect challenge", "Where the aspect can become costly or difficult.", "aspect", 4),
      field("aspectResponseSentence", "Aspect response", "The useful response to the tension described above.", "aspect", 4)
    ]
  }
];

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
  module("library-opening", "Opening hook", "{{openingHook}}"),
  module("library-placement", "Placement thesis", "{{placementThesis}}", true),
  module("library-pressure", "How it shows up", "{{placementPressure}}", true),
  module("library-response", "Challenge and response", "{{placementCorrection}}", true),
  module("library-close", "Takeaway", "{{closingLine}}")
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
  { id: "planetFunction", keys: [`fallback-vocab/planet-function/${planet}`, `fallback-vocab/sky-planet-function/${planet}`] },
  { id: "planetProductive", keys: [`fallback-vocab/planet-productive/${planet}`] },
  { id: "planetShadow", keys: [`fallback-vocab/planet-excess/${planet}`] },
  { id: "signCoreDrive", keys: [`fallback-vocab/sign-need/${sign}`] },
  { id: "signMethod", keys: [`fallback-vocab/sign-style/${sign}`, `fallback-vocab/sky-sign-style/${sign}`] },
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
  const before = composition.modules.findIndex(item => item.id === "library-pressure");
  const modules = [...composition.modules];
  modules.splice(before >= 0 ? before : modules.length, 0, next);
  return { ...composition, modules };
}

const legacyBodyModuleIds = new Set(["opening", "practice", "manifestations", "third-manifestation", "response", "intro-mechanism", "intro-close", "close"]);
const timingModuleIds = new Set(["single-pass", "first-pass", "return", "final-pass", "long-cycle"]);
const primaryLibraryModuleIds = new Set(["library-placement", "library-pressure", "library-response"]);
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
      ...pick("library-opening", "library-placement"),
      ...selectedExperiences,
      ...pick("library-pressure"),
      ...timing,
      ...pick("library-response", "library-close")
    ]
  };
}

export function skyWritingLibraryIsPrimary(composition?: SkyWritingLibraryComposition | null) {
  if (!composition) return false;
  return [...primaryLibraryModuleIds].every(id => composition.modules.some(item => item.id === id && item.enabled && item.required));
}
