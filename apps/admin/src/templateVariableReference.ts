export type TemplateVariableRequirement = "Required" | "Optional" | "Runtime";

export type TemplateVariableReference = {
  name: string;
  label: string;
  meaning: string;
  example: string;
  source: string;
  sourceKind: "saved-copy" | "runtime" | "unmapped";
  requirement: TemplateVariableRequirement;
  fields: string[];
};

type VariableDefinition = Pick<TemplateVariableReference, "meaning" | "example" | "source"> & {
  sourceKind?: TemplateVariableReference["sourceKind"];
};

const variableDefinitions: Record<string, VariableDefinition> = {
  possessive: {
    meaning: "The possessive wording for the person whose chart is being read.",
    example: "Your or Maya's",
    source: "Calculated viewer context"
  },
  planetTitle: {
    meaning: "The display name of the planet or point in this placement.",
    example: "Sun, Moon, or North Node",
    source: "Calculated chart fact"
  },
  planetRef: {
    meaning: "The planet name formatted for use in the middle of a sentence.",
    example: "the Sun or Venus",
    source: "Calculated chart fact"
  },
  planetRefCap: {
    meaning: "The planet name formatted for the beginning of a sentence.",
    example: "The Sun or Venus",
    source: "Calculated chart fact"
  },
  signTitle: {
    meaning: "The display name of the zodiac sign in this placement.",
    example: "Leo",
    source: "Calculated chart fact"
  },
  houseOrdinal: {
    meaning: "The chart house written as an ordinal.",
    example: "1st or 10th",
    source: "Calculated chart fact"
  },
  planetVerb: {
    meaning: "The approved base-form action associated with the planet; it must work after both “you” and “they.”",
    example: "create, protect, or communicate",
    source: "Planet vocabulary"
  },
  signAdverb: {
    meaning: "The approved word describing how this sign tends to act.",
    example: "boldly or carefully",
    source: "Sign vocabulary"
  },
  signNeed: {
    meaning: "The approved phrase naming what this sign needs in order to function well.",
    example: "recognition and creative room",
    source: "Sign vocabulary"
  },
  signStyle: {
    meaning: "The approved phrase describing the sign’s characteristic style.",
    example: "direct and visible",
    source: "Sign vocabulary"
  },
  signShadow: {
    meaning: "The approved phrase describing the sign’s less constructive expression.",
    example: "performing for approval",
    source: "Sign vocabulary"
  },
  planetTopic: {
    meaning: "The life topic governed by the planet or point.",
    example: "identity and purpose",
    source: "Planet vocabulary"
  },
  planetFunction: {
    meaning: "A noun phrase naming what the planet does in the chart.",
    example: "the drive to create",
    source: "Planet vocabulary"
  },
  planetProductive: {
    meaning: "The planet’s constructive or productive expression.",
    example: "confident creative leadership",
    source: "Planet vocabulary"
  },
  planetExcess: {
    meaning: "The approved phrase for what the planet can become when pushed too far.",
    example: "overconfidence or self-importance",
    source: "Planet vocabulary"
  },
  planetIntro: {
    meaning: "Optional introductory sentences that explain the planet before the placement-specific copy begins.",
    example: "The Sun describes identity, purpose, and the need to create.",
    source: "Reviewed fallback hook"
  },
  planetBest: {
    meaning: "A complete sentence describing the planet’s best or most constructive use.",
    example: "At its best, this placement makes confidence generous.",
    source: "Reviewed fallback hook"
  },
  placementSentences: {
    meaning: "Optional approved sentences written specifically for this planet-sign combination.",
    example: "A Sun-in-Leo-specific reader passage",
    source: "Reviewed placement hook"
  },
  placementGerundText: {
    meaning: "Optional day-to-day behavior fragments for this placement, joined into one readable phrase.",
    example: "taking the lead, or putting your name on the work",
    source: "Placement vocabulary"
  },
  placementClauseText: {
    meaning: "Approved placement clauses joined into one complete sentence.",
    example: "It seeks recognition, and it creates visibly.",
    source: "Placement vocabulary"
  },
  modifierSentences: {
    meaning: "Optional complete sentences added for modifiers such as retrograde motion, dignity, or chart sect. Inside this block, {{.}} means the current sentence.",
    example: "A retrograde or dignity sentence",
    source: "Saved modifier templates selected from calculated chart conditions",
    sourceKind: "saved-copy"
  },
  houseTopic: {
    meaning: "A short phrase naming the life area governed by the calculated house.",
    example: "career and public direction",
    source: "House vocabulary"
  },
  houseMeaning: {
    meaning: "The reviewed introductory passage explaining what the calculated house governs.",
    example: "The 10th house describes career, reputation, and public responsibility.",
    source: "Reviewed house hook"
  },
  houseLine: {
    meaning: "One reviewed sentence describing the calculated house.",
    example: "This house describes the work that becomes visible to other people.",
    source: "House vocabulary"
  },
  houseLivedBehavior: {
    meaning: "An optional behavior phrase describing how the placement is lived in the calculated house.",
    example: "building a public body of work",
    source: "Reviewed placement row"
  },
  placementHouseSentences: {
    meaning: "Optional approved sentences written specifically for this planet-house combination.",
    example: "A Sun-in-the-10th-house-specific passage",
    source: "Reviewed placement hook"
  },
  nodeJourney: {
    meaning: "The reviewed North or South Node journey sentence, filled with the opposite sign when needed.",
    example: "A movement from familiar habits toward a new direction",
    source: "Reviewed Node hook"
  },
  oppositeSignTitle: {
    meaning: "The zodiac sign opposite the calculated Node sign.",
    example: "Aquarius when the Node is in Leo",
    source: "Calculated chart fact"
  },
  oppositeDirection: {
    meaning: "The approved directional phrase associated with the opposite Node sign.",
    example: "shared contribution over personal recognition",
    source: "Node vocabulary"
  },
  sectEffect: {
    meaning: "The calculated day-chart or night-chart effect used by a sect modifier sentence.",
    example: "more supported in a day chart",
    source: "Calculated chart condition"
  },
  houseN: {
    meaning: "The empty or source house whose story the bridge is explaining.",
    example: "2nd",
    source: "Calculated chart fact"
  },
  houseM: {
    meaning: "The house where the ruler of the source house is actually placed.",
    example: "10th",
    source: "Calculated chart fact"
  },
  planet: {
    meaning: "The display name of the planet ruling the calculated sign or house.",
    example: "Venus",
    source: "Calculated chart fact"
  },
  sign: {
    meaning: "The display name of the calculated sign used by this legacy bridge template.",
    example: "Taurus",
    source: "Calculated chart fact"
  },
  topicN: {
    meaning: "The life topic governed by the empty or source house.",
    example: "money and self-worth",
    source: "House vocabulary"
  },
  topicM: {
    meaning: "The life topic governed by the house where the ruler is placed.",
    example: "career and public direction",
    source: "House vocabulary"
  },
  planetCore: {
    meaning: "A compact phrase naming the planet’s central function or concern.",
    example: "confidence and creative identity",
    source: "Planet vocabulary"
  },
  angleIntro: {
    meaning: "Optional introductory copy explaining the calculated chart angle.",
    example: "An approved introduction for the calculated chart angle",
    source: "Reviewed angle hook"
  },
  angleTitle: {
    meaning: "The reader-facing name of the calculated chart angle.",
    example: "Ascendant or Midheaven",
    source: "Calculated chart fact"
  },
  angleSignSentences: {
    meaning: "Optional reviewed sentences written for this exact angle-sign combination.",
    example: "A Leo Midheaven-specific reader passage",
    source: "Reviewed angle-sign hook"
  },
  aspectAdj: {
    meaning: "The aspect word phrased so it can connect two chart points in a sentence.",
    example: "trine, square to, or opposite",
    source: "Aspect vocabulary"
  },
  aspectMotion: {
    meaning: "A phrase explaining how the two planetary functions interact through this aspect.",
    example: "support each other or pull in different directions",
    source: "Aspect vocabulary"
  },
  aspectName: {
    meaning: "The display name of the calculated aspect.",
    example: "trine or opposition",
    source: "Calculated chart fact"
  },
  aspectTypeLine: {
    meaning: "A complete reviewed sentence explaining the general behavior of this aspect type.",
    example: "Squares create pressure that has to be worked through actively.",
    source: "Reviewed aspect hook"
  },
  aspectVerb: {
    meaning: "The approved verb describing what the calculated aspect does between two points.",
    example: "supports, challenges, or intensifies",
    source: "Aspect vocabulary"
  },
  planetACore: {
    meaning: "A compact phrase naming the first planet’s central function.",
    example: "the drive to act",
    source: "Planet vocabulary"
  },
  planetATitle: {
    meaning: "The display name of the first planet or point in an aspect.",
    example: "Mars",
    source: "Calculated chart fact"
  },
  planetBCore: {
    meaning: "A compact phrase naming the second planet’s central function.",
    example: "the need for control",
    source: "Planet vocabulary"
  },
  planetBTitle: {
    meaning: "The display name of the second planet or point in an aspect.",
    example: "Pluto",
    source: "Calculated chart fact"
  },
  possessiveLow: {
    meaning: "The possessive viewer wording formatted for the middle of a sentence.",
    example: "your or Maya's",
    source: "Calculated viewer context"
  },
  pairSentences: {
    meaning: "Optional reviewed sentences written for this exact planet-aspect-planet combination.",
    example: "A Mars-trine-Pluto-specific passage",
    source: "Reviewed aspect-pair hook"
  },
  rulerHouseOrdinal: {
    meaning: "The ordinal house where the ruler of the calculated angle or house is placed.",
    example: "7th",
    source: "Calculated chart fact"
  },
  rulerHouseTopic: {
    meaning: "The life topic governed by the house containing the ruler.",
    example: "partnership and commitment",
    source: "House vocabulary"
  },
  rulerSignTitle: {
    meaning: "The sign occupied by the calculated chart ruler.",
    example: "Virgo",
    source: "Calculated chart fact"
  },
  rulerTitle: {
    meaning: "The display name of the planet that rules the calculated sign or angle.",
    example: "Mercury",
    source: "Calculated chart fact"
  },
  otherName: {
    meaning: "The other person’s display name in a relationship reading.",
    example: "Maya",
    source: "Selected relationship profile"
  },
  otherPoss: {
    meaning: "The other person’s possessive name for relationship copy.",
    example: "Maya's",
    source: "Selected relationship profile"
  },
  synAspectLine: {
    meaning: "A complete reviewed sentence for the exact synastry contact between two charts.",
    example: "Your Moon trines Maya's Venus, making affection easier to express.",
    source: "Reviewed synastry hook"
  },
  modeA: {
    meaning: "The editable phrase describing how the first person's planet tends to operate.",
    example: "leading visibly",
    source: "Reviewed planet-mode hook selected for the first chart point",
    sourceKind: "saved-copy"
  },
  modeB: {
    meaning: "The editable phrase describing how the second person's planet tends to operate.",
    example: "seeking steadiness",
    source: "Reviewed planet-mode hook selected for the second chart point",
    sourceKind: "saved-copy"
  },
  askA: {
    meaning: "The editable phrase naming what the first chart point asks for in a relationship.",
    example: "room to act directly",
    source: "Planet-ask vocabulary selected for the first chart point",
    sourceKind: "saved-copy"
  },
  askB: {
    meaning: "The editable phrase naming what the second chart point asks for in a relationship.",
    example: "clear reassurance",
    source: "Planet-ask vocabulary selected for the second chart point",
    sourceKind: "saved-copy"
  },
  gratesA: {
    meaning: "The editable friction phrase associated with the first chart point.",
    example: "being rushed before the feeling is clear",
    source: "Reviewed planet-friction hook selected for the first chart point",
    sourceKind: "saved-copy"
  },
  gratesB: {
    meaning: "The editable friction phrase associated with the second chart point.",
    example: "waiting while the decision stays open",
    source: "Reviewed planet-friction hook selected for the second chart point",
    sourceKind: "saved-copy"
  },
  sceneA: {
    meaning: "The editable everyday-life example associated with the first chart point.",
    example: "one person making the plan before checking in",
    source: "Planet-scene vocabulary selected for the first chart point",
    sourceKind: "saved-copy"
  },
  sceneB: {
    meaning: "The editable everyday-life example associated with the second chart point.",
    example: "the other person revisiting an agreement later",
    source: "Planet-scene vocabulary selected for the second chart point",
    sourceKind: "saved-copy"
  },
  compatDomain: {
    meaning: "The relationship area emphasized by the calculated compatibility pattern.",
    example: "communication, trust, or attraction",
    source: "Compatibility vocabulary"
  },
  elementPattern: {
    meaning: "A reviewed description of how the two charts’ dominant elements combine.",
    example: "Fire adds momentum while Earth asks for a workable plan.",
    source: "Compatibility vocabulary"
  },
  friendBlock: {
    meaning: "The complete pre-rendered passage written about the selected other person.",
    example: "A paragraph using Maya's name and pronouns",
    source: "Relationship renderer"
  },
  readerBlock: {
    meaning: "The complete pre-rendered passage written directly to the reader.",
    example: "A paragraph written with you and your",
    source: "Relationship renderer"
  },
  signATitle: {
    meaning: "The display name of the first sign in a compatibility comparison.",
    example: "Leo",
    source: "Calculated chart fact"
  },
  signBTitle: {
    meaning: "The display name of the second sign in a compatibility comparison.",
    example: "Aquarius",
    source: "Calculated chart fact"
  },
  hook: {
    meaning: "The approved opening line that introduces the assembled card’s central idea.",
    example: "You both notice what everyone else misses.",
    source: "Reviewed card hook"
  },
  lived: {
    meaning: "The approved sentence showing how the pattern tends to appear in everyday life.",
    example: "That can look like solving the problem before either person names it.",
    source: "Reviewed lived-experience phrase"
  },
  turn: {
    meaning: "The approved sentence that introduces tension, nuance, or a constructive next move.",
    example: "The risk is assuming agreement when the details have not been discussed.",
    source: "Reviewed card turn"
  },
  natalTitle: {
    meaning: "The display name of the natal planet, point, or angle receiving a transit.",
    example: "natal Venus",
    source: "Calculated chart fact"
  },
  transitRef: {
    meaning: "The transiting planet name formatted for use in the middle of a sentence.",
    example: "transiting Saturn",
    source: "Calculated transit fact"
  },
  transitTitle: {
    meaning: "The display name of the transiting planet or point.",
    example: "Saturn",
    source: "Calculated transit fact"
  },
  transitTopic: {
    meaning: "The editable life-topic phrase selected for the transiting planet.",
    example: "Saturn's focus on structure and responsibility",
    source: "Planet-topic vocabulary selected by the transit resolver",
    sourceKind: "saved-copy"
  },
  natalCore: {
    meaning: "The editable phrase naming the natal planet or angle function receiving the transit.",
    example: "your relationship needs and values",
    source: "Reviewed natal-core hook with planet-core vocabulary fallback",
    sourceKind: "saved-copy"
  },
  natalArea: {
    meaning: "The editable life-area phrase inserted into a transit effect or type sentence.",
    example: "relationships, values, and what feels worth choosing",
    source: "Planet-topic or angle-area vocabulary selected by the transit resolver",
    sourceKind: "saved-copy"
  },
  transitEffect: {
    meaning: "The editable transit-effect passage selected for the aspect family, transiting planet, and natal target.",
    example: "relationship choices become easier to see clearly",
    source: "Reviewed soft or hard transit-effect hook",
    sourceKind: "saved-copy"
  },
  transitTypeLine: {
    meaning: "A complete reviewed sentence explaining the general type of transit contact.",
    example: "A conjunction brings the two functions into the same immediate problem.",
    source: "Reviewed transit hook"
  },
  transitEffectLine: {
    meaning: "A complete reviewed sentence describing the likely effect of this exact transit.",
    example: "This can make relationship expectations harder to avoid.",
    source: "Reviewed transit effect hook"
  },
  houseEffect: {
    meaning: "The approved phrase describing how a transit affects the calculated house topic.",
    example: "expands your public responsibilities",
    source: "Transit-house vocabulary"
  },
  retroMeaning: {
    meaning: "A reviewed explanation of what the planet’s retrograde phase asks people to revisit.",
    example: "reconsider how commitments are structured",
    source: "Reviewed retrograde hook"
  },
  timeOpen: {
    meaning: "The formatted timing phrase used at the beginning of a sentence.",
    example: "From August 12 through September 3",
    source: "Calculated transit timing"
  },
  timeInline: {
    meaning: "The formatted timing phrase used naturally in the middle of a sentence.",
    example: "through September 3",
    source: "Calculated transit timing"
  },
  articleHeadline: {
    meaning: "The complete approved headline inserted into an article wrapper.",
    example: "Jupiter in Leo",
    source: "Selected article record"
  },
  articleBody: {
    meaning: "The complete approved article copy inserted into an article wrapper.",
    example: "The full multi-paragraph Sky write-up",
    source: "Selected article record"
  },
  windowFrame: {
    meaning: "The reviewed opening passage that explains the current planet's broader transit window.",
    example: "Jupiter remains in Leo for about a year, expanding questions of visibility and creative confidence.",
    source: "Reviewed Sky placement hook"
  },
  planetFrame: {
    meaning: "Optional reviewed context for the planet's current retrograde or shadow phase.",
    example: "During the retrograde, growth may require revisiting an earlier promise or plan.",
    source: "Reviewed Sky planet-phase hook"
  },
  signLore: {
    meaning: "Optional reviewed background explaining the sign's symbolism in this Sky placement.",
    example: "Leo brings questions of pride, courage, generosity, and being seen.",
    source: "Reviewed Sky sign-lore hook"
  },
  signCopy: {
    meaning: "The main reviewed write-up for this exact planet-in-sign placement.",
    example: "The approved Jupiter-in-Leo placement passage",
    source: "Reviewed Sky sign-copy hook"
  },
  currentAspects: {
    meaning: "Optional paragraphs assembled from the exact aspects currently made by this Sky placement.",
    example: "Jupiter square Uranus adds pressure to change direction quickly.",
    source: "Reviewed current Sky aspect rows"
  },
  aspectInsert: {
    meaning: "The optional current-aspect passage inserted into a continuous Sky placement article.",
    example: "A dated aspect paragraph relevant to this placement",
    source: "Reviewed current Sky aspect rows selected by the resolver",
    sourceKind: "saved-copy"
  },
  other_name: {
    meaning: "The selected other person's display name used by legacy relationship copy.",
    example: "Maya",
    source: "Selected relationship profile",
    sourceKind: "runtime"
  },
  priorSign: {
    meaning: "The sign occupied immediately before the current calculated Sky placement.",
    example: "Cancer",
    source: "Calculated transit history",
    sourceKind: "runtime"
  }
};

function humanizeVariable(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[._-]+/gu, " ")
    .replace(/^\w/u, (letter) => letter.toUpperCase());
}

function genericDefinition(name: string): VariableDefinition {
  const label = humanizeVariable(name).toLowerCase();
  if (/date(?:withyear)?$/iu.test(name)) return { meaning: `The calculated ${label} used for this reading.`, example: "A formatted calendar date", source: "Calculated runtime fact" };
  if (/^holder\d(?:poss(?:cap)?|subject|object|pronounposs)?$/iu.test(name)) return { meaning: `The calculated ${label} used to keep relationship voice and perspective consistent.`, example: "A reader or relationship-profile name or pronoun", source: "Calculated relationship context" };
  if (/title$/iu.test(name)) return { meaning: `The display name for the calculated ${label.replace(/ title$/u, "")}.`, example: "A reader-facing name", source: "Calculated runtime fact" };
  if (/sentences?$/iu.test(name)) return { meaning: `Reviewed sentence copy supplied for ${label.replace(/ sentences?$/u, "")}.`, example: "One or more complete sentences", source: "Reviewed fallback source" };
  if (/^(is|has)[A-Z]/u.test(name)) return { meaning: `Whether the calculated chart has ${label.replace(/^(is|has) /u, "")}.`, example: "Yes or no", source: "Calculated runtime fact" };
  return { meaning: `The ${label} value declared by this template does not have a documented provider.`, example: "No canonical value is wired", source: "No canonical provider", sourceKind: "unmapped" };
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function collectTemplateStrings(value: unknown, path: string, output: Array<{ field: string; value: string }>) {
  if (typeof value === "string") {
    if (value.includes("{{")) output.push({ field: path || "Template", value });
    return;
  }
  if (Array.isArray(value)) return;
  if (!value || typeof value !== "object") return;
  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    collectTemplateStrings(nested, path ? `${path}.${key}` : key, output);
  });
}

export function templateVariableReferences(
  fields: Record<string, unknown>,
  packageRecord: Record<string, unknown> = {}
): TemplateVariableReference[] {
  const required = new Set(stringArray(packageRecord.requiredSlots));
  const optional = new Set(stringArray(packageRecord.optionalSlots));
  const usages = new Map<string, { fields: Set<string>; conditional: boolean }>();
  const strings: Array<{ field: string; value: string }> = [];
  collectTemplateStrings(fields, "", strings);
  collectTemplateStrings(packageRecord, "Package", strings);

  // Resolver dependencies can be declared in requiredSlots/optionalSlots even
  // when they are consumed inside another saved phrase instead of appearing in
  // the outer template. They still need to be visible and editable in the map.
  required.forEach((name) => usages.set(name, { fields: new Set(["Resolver dependency"]), conditional: false }));
  optional.forEach((name) => usages.set(name, { fields: new Set(["Resolver dependency"]), conditional: true }));

  strings.forEach(({ field, value }) => {
    for (const match of value.matchAll(/\{\{\s*([#\/^]?)\s*([\w.-]+|\.)\s*\}\}/gu)) {
      const marker = match[1];
      const name = match[2];
      if (name === ".") continue;
      const usage = usages.get(name) ?? { fields: new Set<string>(), conditional: false };
      usage.fields.add(field.replace(/^Package\./u, "") || "Template");
      if (marker === "#" || marker === "^") usage.conditional = true;
      usages.set(name, usage);
    }
  });

  return [...usages.entries()]
    .map(([name, usage]) => {
      const definition = variableDefinitions[name] ?? genericDefinition(name);
      const requirement: TemplateVariableRequirement = required.has(name)
        ? "Required"
        : optional.has(name) || usage.conditional
          ? "Optional"
          : "Runtime";
      return {
        name,
        label: humanizeVariable(name),
        ...definition,
        sourceKind: definition.sourceKind ?? (/^(Calculated|Runtime|Selected relationship|Relationship renderer)/u.test(definition.source)
          ? "runtime"
          : "saved-copy") as TemplateVariableReference["sourceKind"],
        requirement,
        fields: [...usage.fields].sort()
      };
    })
    .sort((left, right) => {
      const requirementOrder = { Required: 0, Optional: 1, Runtime: 2 };
      return requirementOrder[left.requirement] - requirementOrder[right.requirement]
        || left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
    });
}
