import { planetSignDignity, type TraditionalDignityPlanet } from "../services/planetSignDignity.mjs";

/** Short-form Sky copy. Never substitute these phrases for natal or dignity paragraphs. */
export const skyDebilityPhraseNames = [
  "livedExperienceClause", "situationPhrase", "planetFunctionVerbPhrase", "responseClause"
] as const;
export type SkyDebilityPhraseName = typeof skyDebilityPhraseNames[number];
export type SkyDebilityPhraseSet = Record<SkyDebilityPhraseName, string> & {
  planetTitle: TraditionalDignityPlanet;
  signTitle: string;
};

// Owner authorized this matched bank in the creation thread. The count-first
// refinement changes only the supplied Venus/Scorpio function to "connect with
// others"; all other placement wording is preserved. Dignity is calculated.
export const skyDebilityPhraseSets: readonly SkyDebilityPhraseSet[] = [
  { planetTitle: "Sun", signTitle: "Aquarius",
    livedExperienceClause: "want credit for your work but feel awkward drawing attention to what you contributed",
    situationPhrase: "a group project",
    planetFunctionVerbPhrase: "express what matters to us",
    responseClause: "name what you contributed without treating recognition as something you should not need" },
  { planetTitle: "Sun", signTitle: "Libra",
    livedExperienceClause: "agree to a plan that works for everyone else before noticing what it costs you",
    situationPhrase: "a decision about how to spend your time",
    planetFunctionVerbPhrase: "express what matters to us",
    responseClause: "say what you need before agreeing to the plan" },
  { planetTitle: "Moon", signTitle: "Capricorn",
    livedExperienceClause: "keep working through exhaustion because stopping feels like letting someone down",
    situationPhrase: "an evening when there is still work to do",
    planetFunctionVerbPhrase: "respond to what we need",
    responseClause: "take a break before finishing everything on your list" },
  { planetTitle: "Moon", signTitle: "Scorpio",
    livedExperienceClause: "hold back how hurt you feel because you do not want someone to see how much it mattered",
    situationPhrase: "a conversation about a disappointment",
    planetFunctionVerbPhrase: "respond to what we need",
    responseClause: "give yourself time to name what hurt before deciding how to respond" },
  { planetTitle: "Mercury", signTitle: "Sagittarius",
    livedExperienceClause: "explain the bigger idea so quickly that an important detail gets left out",
    situationPhrase: "a conversation about how a plan will work",
    planetFunctionVerbPhrase: "make ourselves understood",
    responseClause: "check the details before treating the plan as agreed" },
  { planetTitle: "Mercury", signTitle: "Pisces",
    livedExperienceClause: "know what you are trying to say but struggle to put it into words someone else can follow",
    situationPhrase: "a message that needs a clear answer",
    planetFunctionVerbPhrase: "make ourselves understood",
    responseClause: "write down the main point before trying to explain everything around it" },
  { planetTitle: "Venus", signTitle: "Aries",
    livedExperienceClause: "push for an answer about where you stand before the other person has had time to respond",
    situationPhrase: "a conversation about what you each want",
    planetFunctionVerbPhrase: "connect",
    responseClause: "say what you want without treating a slower answer as rejection" },
  { planetTitle: "Venus", signTitle: "Scorpio",
    livedExperienceClause: "want reassurance but find it hard to ask for",
    situationPhrase: "a conversation with someone you love",
    planetFunctionVerbPhrase: "connect with others",
    responseClause: "ask directly for the support you need" },
  { planetTitle: "Venus", signTitle: "Virgo",
    livedExperienceClause: "notice what needs fixing so quickly that it becomes hard to enjoy what is already going well",
    situationPhrase: "an evening with someone you care about",
    planetFunctionVerbPhrase: "connect",
    responseClause: "acknowledge what you appreciate before bringing up what you would like to change" },
  { planetTitle: "Mars", signTitle: "Taurus",
    livedExperienceClause: "keep tolerating a problem because dealing with it would disrupt the routine you rely on",
    situationPhrase: "a conversation about changing an arrangement",
    planetFunctionVerbPhrase: "handle anger",
    responseClause: "address one part of the problem instead of waiting until you cannot stand it" },
  { planetTitle: "Mars", signTitle: "Libra",
    livedExperienceClause: "spend so long making a complaint sound fair that you never say what needs to change",
    situationPhrase: "a disagreement about how work is being divided",
    planetFunctionVerbPhrase: "handle anger",
    responseClause: "name the change you need without trying to win agreement on every detail" },
  { planetTitle: "Mars", signTitle: "Cancer",
    livedExperienceClause: "hold in your frustration until it comes out more sharply than you intended",
    situationPhrase: "a disagreement at work",
    planetFunctionVerbPhrase: "handle anger",
    responseClause: "say what is bothering you before resentment builds" },
  { planetTitle: "Jupiter", signTitle: "Gemini",
    livedExperienceClause: "follow so many promising ideas that you lose track of the one you meant to pursue",
    situationPhrase: "a choice between opportunities",
    planetFunctionVerbPhrase: "see what is possible",
    responseClause: "choose one possibility to explore before taking on another" },
  { planetTitle: "Jupiter", signTitle: "Virgo",
    livedExperienceClause: "find another detail to improve each time you get close to sharing something you have worked on",
    situationPhrase: "a project that is ready for someone else to see",
    planetFunctionVerbPhrase: "see what is possible",
    responseClause: "decide what the work needs to do before giving it another round of corrections" },
  { planetTitle: "Jupiter", signTitle: "Capricorn",
    livedExperienceClause: "dismiss an opportunity because you cannot yet see how every part of it would work",
    situationPhrase: "an invitation to try something unfamiliar",
    planetFunctionVerbPhrase: "see what is possible",
    responseClause: "look into what a first step would require before ruling out the whole possibility" },
  { planetTitle: "Saturn", signTitle: "Cancer",
    livedExperienceClause: "take on another responsibility because saying no feels like not caring",
    situationPhrase: "a request for help at home",
    planetFunctionVerbPhrase: "take responsibility",
    responseClause: "be clear about the help you can give without making yourself responsible for everything" },
  { planetTitle: "Saturn", signTitle: "Leo",
    livedExperienceClause: "hesitate to ask for help because you think you should already know what you are doing",
    situationPhrase: "a responsibility that puts your work on display",
    planetFunctionVerbPhrase: "take responsibility",
    responseClause: "get the guidance you need before expecting yourself to have every answer" },
  { planetTitle: "Saturn", signTitle: "Aries",
    livedExperienceClause: "feel pressure to make a decision before you are ready",
    situationPhrase: "a new commitment",
    planetFunctionVerbPhrase: "take responsibility",
    responseClause: "give yourself time to think before committing" }
];

export const skyDebilityPhraseGuidance: Record<SkyDebilityPhraseName, string> = {
  livedExperienceClause: 'Completes "You may…". Start with a base-form verb; do not repeat "You may" or add final punctuation.',
  situationPhrase: 'A singular everyday situation, including its article, such as "a new commitment". No final punctuation.',
  planetFunctionVerbPhrase: 'Completes "it takes more effort to…", such as "take responsibility". Older saved templates may use "how we…". No final punctuation.',
  responseClause: 'Completes "It may help to…". Start with a base-form verb; do not repeat the introduction or add final punctuation.'
};

export function skyDebilityPlacementId(planet: string, sign: string) {
  return `${planet.trim().toLowerCase()}/${sign.trim().toLowerCase()}`;
}
export function skyDebilityPhraseKey(planet: string, sign: string, name: SkyDebilityPhraseName) {
  return `cms/sky-debility/placement/${skyDebilityPlacementId(planet, sign)}/${name}`;
}
export function skyDebilityPhraseSet(planet: string, sign: string) {
  const identity = skyDebilityPlacementId(planet, sign);
  return skyDebilityPhraseSets.find(row => skyDebilityPlacementId(row.planetTitle, row.signTitle) === identity);
}
export function skyDebilityConditionLabel(planet: string, sign: string) {
  return planetSignDignity(planet, sign).dignities.filter(value => value === "detriment" || value === "fall").join(" and ");
}
