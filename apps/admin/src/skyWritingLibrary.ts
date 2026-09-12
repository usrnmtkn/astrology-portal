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

const field = (id: string, label: string, description: string, kind: SkyWritingLibrarySourceKind, rows = 4): SkyWritingLibraryField => ({ id, label, description, kind, rows });

export const SKY_WRITING_LIBRARY_GROUPS: SkyWritingLibraryGroup[] = [
  {
    id: "planet",
    label: "Planet language",
    description: "Reusable writing about what this planet does. Planet sources can be linked across every sign for the same planet.",
    fields: [
      field("planetAppositive", "Planet appositive", "A compact phrase such as ‘the planet of …’ for openings and explanatory sentences.", "planet", 2),
      field("planetSummary", "Planet summary / lore", "A concise reusable explanation of the planet’s role, symbolism, or larger meaning.", "planet", 5),
      field("planetFunction", "Planet function", "What the planet actually does in lived terms: the activity, need, or process it represents.", "planet", 4),
      field("planetProductive", "Productive expression", "How this planet can operate constructively when its function has somewhere useful to go.", "planet", 4),
      field("planetShadow", "Planet shadow / excess", "What can happen when the same planetary function gets overused, distorted, or pushed too far.", "planet", 4),
      field("planetCollectiveExpression", "Collective expression", "How this planet may show up in larger cultural, social, or collective patterns.", "planet", 4)
    ]
  },
  {
    id: "sign",
    label: "Zodiac sign language",
    description: "Reusable sign lore and method. Sign sources can be linked across every planet moving through the same sign.",
    fields: [
      field("signAppositive", "Sign appositive", "A compact phrase such as ‘this mutable earth sign’ for explanatory sentences.", "sign", 2),
      field("signSummary", "Sign summary / lore", "A concise reusable explanation of the sign’s character, symbolism, or orientation.", "sign", 5),
      field("signCoreDrive", "Core drive", "What the sign is trying to accomplish or protect.", "sign", 4),
      field("signMethod", "Method", "How the sign tends to approach problems, choices, change, or expression.", "sign", 4),
      field("signGift", "Gift", "What this sign tends to make easier, clearer, or more available when used well.", "sign", 4),
      field("signShadow", "Sign shadow", "Where the sign’s method can become rigid, excessive, avoidant, or counterproductive.", "sign", 4),
      field("signValues", "Values and life themes", "The tangible subjects, needs, and life concerns this sign repeatedly brings into focus.", "sign", 4)
    ]
  },
  {
    id: "placement",
    label: "Planet × sign synthesis",
    description: "The most important layer. Write the meaning of this exact planet-in-sign combination instead of pasting planet lore beside sign lore.",
    fields: [
      field("placementThesis", "Placement thesis", "The central argument for this exact planet in this exact sign.", "placement", 5),
      field("placementOpportunity", "Opportunity", "What may become easier, more available, or more worth developing during this placement.", "placement", 4),
      field("placementPressure", "Pressure", "What becomes harder to ignore, manage, or keep doing in the old way.", "placement", 4),
      field("placementShadow", "Placement shadow", "The specific failure mode created by this planet and sign together.", "placement", 4),
      field("placementCorrection", "Correction", "The adjustment that helps when the placement’s strength starts becoming costly.", "placement", 4),
      field("placementPractice", "Practice", "Concrete ways a reader can work with the placement without turning the article into generic homework.", "placement", 4),
      field("placementCollectiveTheme", "Collective theme", "A larger social or cultural expression of this exact placement.", "placement", 4),
      field("placementCollectiveShadow", "Collective shadow", "A larger social or cultural excess, distortion, or consequence of this exact placement.", "placement", 4)
    ]
  },
  {
    id: "experiences",
    label: "Experience hooks",
    description: "Broad, selectable manifestations by life area. These give the writer multiple plausible ways the astrology can land without forcing one narrow canned example.",
    fields: [
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
    description: "Optional reader-facing openings, reflection prompts, and closing lines. These are authored sources, not calculated variables.",
    fields: [
      field("openingHook", "Opening hook", "The opening idea or reader-facing hook. This reuses the existing V5 opening source when it is already present.", "placement", 4),
      field("reflectionQuestion", "Reflection question", "A question that deepens the article without becoming a generic journal prompt.", "placement", 3),
      field("closingLine", "Closing line", "A concise final point that lands the argument without introducing a new theme.", "placement", 3)
    ]
  },
  {
    id: "context",
    label: "Optional context blocks",
    description: "Use only when the body or event actually benefits from this context. Empty optional blocks are omitted.",
    fields: [
      field("mythologySummary", "Mythology summary", "A concise mythic story or symbol that materially helps explain the body or placement.", "planet", 5),
      field("astronomySummary", "Astronomy summary", "A concise factual explanation for unusual astronomical bodies or cycles when useful.", "planet", 5),
      field("historicalCallback", "Previous-cycle / historical callback", "Context from a prior comparable residency or cycle. Calculated dates should still come from fact variables.", "placement", 5),
      field("returnMeaning", "Return meaning", "Reusable meaning for a Jupiter, Saturn, Chiron, or other supported return story when applicable.", "planet", 5)
    ]
  },
  {
    id: "aspects",
    label: "Aspect writing",
    description: "Friendly access to the existing aspect sentence sources used by defining aspect modules.",
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

export const SKY_WRITING_LIBRARY_MODULES: SkyWritingLibraryModule[] = [
  module("library-planet", "Planet meaning", "{{planetSummary}} {{planetFunction}}"),
  module("library-sign", "Sign meaning", "{{signSummary}} {{signCoreDrive}} {{signMethod}}"),
  module("library-placement", "Placement thesis and opportunity", "{{placementThesis}} {{placementOpportunity}}"),
  module("library-pressure", "Placement pressure and shadow", "{{placementPressure}} {{placementShadow}}"),
  module("library-response", "Placement correction and practice", "{{placementCorrection}} {{placementPractice}}"),
  module("library-collective", "Collective expression", "{{placementCollectiveTheme}} {{placementCollectiveShadow}}"),
  module("library-experience-work", "Experience · work", "{{experienceWork}}"),
  module("library-experience-money", "Experience · money", "{{experienceMoney}}"),
  module("library-experience-relationships", "Experience · relationships", "{{experienceRelationships}}"),
  module("library-experience-home", "Experience · home", "{{experienceHome}}"),
  module("library-experience-body", "Experience · body", "{{experienceBody}}"),
  module("library-experience-time", "Experience · time", "{{experienceTime}}"),
  module("library-experience-recognition", "Experience · recognition", "{{experienceRecognition}}"),
  module("library-experience-creative", "Experience · creativity", "{{experienceCreative}}"),
  module("library-mythology", "Optional mythology", "{{mythologySummary}}"),
  module("library-history", "Optional previous-cycle context", "{{historicalCallback}}"),
  module("library-close", "Reflection and close", "{{reflectionQuestion}} {{closingLine}}")
];

export const SKY_WRITING_LIBRARY_FIELD_IDS = SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields.map(item => item.id));

export function skyWritingLibraryInstalled(composition?: SkyWritingLibraryComposition | null) {
  return Boolean(composition && SKY_WRITING_LIBRARY_FIELD_IDS.some(id => Object.hasOwn(composition.sources, id)));
}

export function installSkyWritingLibrary(composition: SkyWritingLibraryComposition): SkyWritingLibraryComposition {
  const next = structuredClone(composition);
  for (const group of SKY_WRITING_LIBRARY_GROUPS) {
    for (const item of group.fields) {
      if (!Object.hasOwn(next.sources, item.id)) next.sources[item.id] = { kind: item.kind, text: "" };
    }
  }
  const moduleIds = new Set(next.modules.map(item => item.id));
  for (const item of SKY_WRITING_LIBRARY_MODULES) {
    if (!moduleIds.has(item.id) && next.modules.length < 32) next.modules.push(structuredClone(item));
  }
  return next;
}

const legacyBodyModuleIds = new Set(["practice", "manifestations", "third-manifestation", "response", "intro-mechanism", "intro-close"]);
const primaryLibraryModuleIds = new Set(["library-placement", "library-response"]);

export function preferSkyWritingLibrary(composition: SkyWritingLibraryComposition): SkyWritingLibraryComposition {
  const installed = installSkyWritingLibrary(composition);
  return {
    ...installed,
    modules: installed.modules.map(item => legacyBodyModuleIds.has(item.id)
      ? { ...item, enabled: false, required: false }
      : primaryLibraryModuleIds.has(item.id)
        ? { ...item, enabled: true, required: true }
        : item)
  };
}

export function skyWritingLibraryIsPrimary(composition?: SkyWritingLibraryComposition | null) {
  if (!composition) return false;
  return composition.modules.some(item => item.id === "library-placement" && item.enabled && item.required)
    && composition.modules.some(item => item.id === "library-response" && item.enabled && item.required);
}
