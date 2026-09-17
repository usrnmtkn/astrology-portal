import { PLACEMENT_DIGNITY_FIELDS } from "./placementDignityMeaning.mjs";
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
      field("planetFunction", "Planet function", "A grammatical ingredient that follows “describes.” Write the planet’s work as a noun phrase, not a complete sentence. Example: identity, vitality, and the part of life that wants to be lived with purpose.", "planet", 4),
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
      field("signCoreDrive", "Core drive", "A grammatical ingredient that follows “pursues.” Write what the sign keeps trying to establish as a noun phrase, not a complete sentence.", "sign", 4),
      field("signMethod", "Method", "A grammatical ingredient that follows “through.” Write how the sign tends to go about it as a noun or gerund phrase, not a complete sentence.", "sign", 4),
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
      ...PLACEMENT_DIGNITY_FIELDS,
      field("placementThesis", "Placement thesis", "What is distinctive about this exact planet–sign combination. Do not repeat the planet’s general function or the sign’s general motivation. Prefilled from the existing TLDR What when available.", "placement", 4),
      field("placementOpportunity", "Opportunity", "What becomes possible through the lived situation already described. Author this only when it is distinct from the thesis and the takeaway.", "placement", 4),
      field("placementPressure", "The challenge", "The complete challenge paragraph. Name the behavior that creates difficulty and what it costs in time, work, money, relationships, or another relevant area. Do not merely repeat the calculated dignity condition.", "placement", 4),
      field("responseSentence", "Response", "The response to the specific difficulty already described in the challenge paragraph.", "placement", 4),
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
      field("experienceGeneral", "General", "A recognizable situation: a behavior and its consequence, not a list of traits. Prefilled from the existing lived passage when one exists.", "placement", 3),
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
      field("closingLine", "Closing line", "Prefilled from the existing TLDR Takeaway when available.", "placement", 3),
      field("practiceClosingLine", "Practice close", "Perspective or permission that completes the article without introducing a new assignment.", "placement", 3)
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
