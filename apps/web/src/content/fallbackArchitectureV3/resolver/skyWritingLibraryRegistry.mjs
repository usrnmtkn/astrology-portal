import { ZODIAC_SEASON_VARIABLES } from "./zodiacSeasonVariables.mjs";
// Shared editorial field registry. This is not reader prose.
const field = (id, label, description, kind, rows = 4) => ({ id, label, description, kind, rows });

export const SKY_WRITING_LIBRARY_GROUPS = [
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
      ...ZODIAC_SEASON_VARIABLES,
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

export const SKY_WRITING_LIBRARY_FIELD_IDS = Object.freeze(SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields.map(item => item.id)));
