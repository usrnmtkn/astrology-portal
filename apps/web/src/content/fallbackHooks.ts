export type FallbackHookSurface = "sky" | "you" | "natal" | "friends" | "synastry" | "composite" | "relationship" | "settings";

export type FallbackHookDomain = "sky" | "natal" | "relationship";

export type FallbackHookContext = Record<string, string | number | null | undefined>;

export type FallbackHookCopyGuidance = {
  headline: string;
  summary: string;
  body: string;
  bestMove: string;
  emptyState: string;
};

export type FallbackHookDefinition = {
  key: string;
  label: string;
  surface: FallbackHookSurface;
  domain: FallbackHookDomain;
  mode: "feed" | "in_depth" | "article" | "system";
  description: string;
  knowledgeIdTemplates: string[];
  requiredFacts: string[];
  copy: FallbackHookCopyGuidance;
};

export const fallbackHookDefinitions = [
  {
    key: "sky.seasonal-current",
    label: "Sky > Season",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Sun sign season cards, such as Gemini Season, with current-sky aspects layered in.",
    knowledgeIdTemplates: ["sky-{planet}-in-{sign}", "{planet}-in-{sign}"],
    requiredFacts: ["sign", "seasonPlanet=Sun", "optional active aspect", "optional date/orb"],
    copy: {
      headline: "{{sign}} Season",
      summary: "{{sign}} Season puts attention on the way this sign handles life in real time. Notice which conversation, decision, or pattern keeps asking for a clearer response.",
      body: "The Sun sets the larger tone of the season. In {{sign}}, attention moves through {{signStyle}}. This is a current collective theme, so the writing should name what people may notice and what to do with it.",
      bestMove: "Choose one question, conversation, or next step that makes the season useful instead of vague.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "sky.lunar-cycle",
    label: "Sky > Lunar Cycle",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Moon sign and lunar cycle cards, including the Moon's strongest active aspect.",
    knowledgeIdTemplates: ["sky-{planet}-in-{sign}", "{planet}-in-{sign}"],
    requiredFacts: ["moon sign", "moon phase", "optional strongest aspect"],
    copy: {
      headline: "Moon in {{sign}}",
      summary: "The Moon in {{sign}} can make the day feel filtered through {{signStyle}}. Needs, moods, and reactions may become easier to read when you slow the first response down.",
      body: "The Moon describes what people reach for quickly: comfort, safety, memory, appetite, mood, and reaction. In {{sign}}, those needs tend to move through {{signStyle}}. If the day feels reactive, start by naming the need before deciding what to do with it.",
      bestMove: "Pause before answering. Separate the feeling from the fact, then choose the response that still makes sense later.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "sky.planetary-placement",
    label: "Sky > Planetary Placement",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Current sky write-up for a planet moving through a sign, separate from natal placement language.",
    knowledgeIdTemplates: ["sky-{planet}-in-{sign}", "{planet}-in-{sign}"],
    requiredFacts: ["planet", "sign", "planet topic", "sign style"],
    copy: {
      headline: "{{planet}} in {{sign}}",
      summary: "{{planet}} moving through {{sign}} brings {{planetTopic}} into a {{signStyle}} style. Watch where that topic shows up in ordinary decisions.",
      body: "The planet names the topic. The sign describes the condition it is moving through. With {{planet}} in {{sign}}, {{planetTopic}} may come through {{signStyle}}. Write this as current sky timing, not natal identity.",
      bestMove: "Pick one concrete response connected to {{planetTopic}}: ask the question, make the edit, set the boundary, schedule the next step, or wait until the facts are clearer.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "sky.aspect-detail",
    label: "Sky > Current Aspect Detail",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Current sky aspects between two planets, with action and timing.",
    knowledgeIdTemplates: ["sky-{planetA}-{aspect}-{planetB}", "{planetA}-{aspect}-{planetB}", "{planetB}-{aspect}-{planetA}"],
    requiredFacts: ["planetA", "planetB", "aspect", "orb", "applying/separating optional"],
    copy: {
      headline: "{{planetA}} {{aspect}} {{planetB}}",
      summary: "{{planetA}} and {{planetB}} are in contact, so two themes may need to be read together before the day makes sense.",
      body: "{{planetA}} brings {{planetATopic}}. {{planetB}} brings {{planetBTopic}}. Through a {{aspect}} aspect, these topics may blend, contrast, cooperate, or create friction depending on the aspect. The useful move is not to over-explain the feeling. Name both sides, then make the next step smaller and clearer.",
      bestMove: "Ask what is actually being mixed together here. Then choose the action that addresses both sides without letting one take over.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "sky.retrograde",
    label: "Sky > Retrograde Detail",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Planet-specific retrograde copy, using the planet's topic instead of generic retrograde text.",
    knowledgeIdTemplates: ["retrograde-{planet}", "sky-retrograde-{planet}", "{planet}-retrograde"],
    requiredFacts: ["planet", "planet topic", "retrograde status"],
    copy: {
      headline: "{{planet}} Retrograde",
      summary: "{{planet}} retrograde turns attention back toward {{planetTopic}}. The point is not panic or reversal; it is review, revision, and a slower look at what has been running on momentum.",
      body: "Retrograde periods often make a planet's topic less linear. With {{planet}} retrograde, {{planetTopic}} may need more checking, revisiting, or patience. What looks like delay can also reveal where the original plan was too thin.",
      bestMove: "Review before you escalate. Recheck the facts, repeat the conversation if needed, and give the process room to show what needs correction.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "you.natal-placement",
    label: "You > Natal Placement",
    surface: "you",
    domain: "natal",
    mode: "in_depth",
    description: "Natal planet-in-sign placements shown on the You page.",
    knowledgeIdTemplates: ["natal-{planet}-in-{sign}", "{planet}-in-{sign}"],
    requiredFacts: ["planet", "sign", "planet topic", "sign style"],
    copy: {
      headline: "Natal {{planet}} in {{sign}}",
      summary: "You may notice {{planetTopic}} expressing through {{signStyle}}. This can describe a recurring tendency, not a fixed identity.",
      body: "In a birth chart, {{planet}} describes {{planetTopic}}. {{sign}} describes the style or condition through which that part of life tends to operate. This may show up as a familiar way of choosing, reacting, wanting, protecting, or making meaning.",
      bestMove: "Keep the strength without letting the habit run automatically. Notice where this pattern helps, then choose the response that fits the present situation.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "you.natal-aspect",
    label: "You > Natal Aspect",
    surface: "you",
    domain: "natal",
    mode: "in_depth",
    description: "Natal aspect cards and aspect detail text.",
    knowledgeIdTemplates: ["natal-{planetA}-{aspect}-{planetB}", "{planetA}-{aspect}-{planetB}", "{planetB}-{aspect}-{planetA}"],
    requiredFacts: ["planetA", "planetB", "aspect", "planet topics"],
    copy: {
      headline: "Natal {{planetA}} {{aspect}} {{planetB}}",
      summary: "This aspect describes a recurring relationship between {{planetATopic}} and {{planetBTopic}}. You may notice it most when both needs are active at once.",
      body: "A natal aspect is a pattern between two parts of life. {{planetA}} brings {{planetATopic}}. {{planetB}} brings {{planetBTopic}}. The {{aspect}} describes how those parts tend to meet, whether through fusion, contrast, friction, support, or flow.",
      bestMove: "Name both parts before choosing. The pattern becomes easier to work with when neither side has to carry the whole story.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "you.transit-to-natal",
    label: "You > Transit To Natal",
    surface: "you",
    domain: "natal",
    mode: "feed",
    description: "Current transit hitting a natal planet or angle on the You page.",
    knowledgeIdTemplates: ["transit-natal-{transitPlanet}-{aspect}-{natalPoint}", "{transitPlanet}-{aspect}-{natalPoint}"],
    requiredFacts: ["transitPlanet", "aspect", "natalPoint", "orb/timing optional"],
    copy: {
      headline: "{{transitPlanet}} {{aspect}} Natal {{natalPoint}}",
      summary: "A current movement of {{transitPlanetTopic}} is contacting your natal {{natalPoint}} pattern. This is timing, not destiny.",
      body: "Transits describe what is being activated now. Your natal {{natalPoint}} already carries a pattern connected to {{natalPointTopic}}. As {{transitPlanet}} contacts it, that part of life may become louder through events, moods, conversations, choices, or pressure to respond.",
      bestMove: "Treat it as a short window for noticing the pattern and choosing the cleanest next step. Do not make the transit bigger than the actual situation.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "friends.synastry-contact",
    label: "Friends > Synastry Contact",
    surface: "friends",
    domain: "relationship",
    mode: "in_depth",
    description: "Two-chart interaspects, such as one person's Venus sextile the other's Ascendant.",
    knowledgeIdTemplates: ["synastry-{planetA}-{aspect}-{planetB}", "relationship-{planetA}-{aspect}-{planetB}", "{planetA}-{aspect}-{planetB}", "{planetB}-{aspect}-{planetA}"],
    requiredFacts: ["personA planet/point", "personB planet/point", "aspect"],
    copy: {
      headline: "{{personA}}'s {{planetA}} {{aspect}} {{personB}}'s {{planetB}}",
      summary: "This contact describes one way the connection gets attention. One person's {{planetATopic}} meets the other person's {{planetBTopic}}.",
      body: "Synastry describes what happens between two charts. This contact may feel easy, charged, familiar, confusing, or motivating depending on the aspect and the people involved. It is most useful when it explains an interaction pattern, not when it turns either person into the problem.",
      bestMove: "Name the dynamic as something happening between you. Then decide what would make the exchange cleaner, kinder, or easier to handle.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "friends.house-overlay",
    label: "Friends > House Overlay",
    surface: "friends",
    domain: "relationship",
    mode: "in_depth",
    description: "Where one person's planet lands in the other person's house.",
    knowledgeIdTemplates: ["synastry-{planet}-in-{house}-house", "relationship-{planet}-in-{house}-house", "personal-planet-house{house}"],
    requiredFacts: ["personA planet", "personB house", "house life area"],
    copy: {
      headline: "{{personA}}'s {{planet}} in {{personB}}'s {{house}} House",
      summary: "This overlay shows where {{personA}} may activate {{personB}}'s {{houseLifeArea}}. The planet brings a topic; the house shows where it lands.",
      body: "House overlays describe the part of life that gets stirred in the other person's chart. {{planet}} brings {{planetTopic}} into {{houseLifeArea}}. This can feel supportive, exposing, energizing, or complicated depending on the rest of the connection.",
      bestMove: "Use the house as context. Ask whether this person is activating a real life area, not just a mood.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "friends.composite-aspect",
    label: "Friends > Composite Aspect",
    surface: "composite",
    domain: "relationship",
    mode: "in_depth",
    description: "Composite chart aspects describing the relationship as its own pattern.",
    knowledgeIdTemplates: ["composite-{planetA}-{aspect}-{planetB}", "relationship-{planetA}-{aspect}-{planetB}", "{planetA}-{aspect}-{planetB}"],
    requiredFacts: ["planetA", "planetB", "aspect", "relationship context"],
    copy: {
      headline: "Composite {{planetA}} {{aspect}} {{planetB}}",
      summary: "This composite aspect describes a pattern that belongs to the relationship itself. It is less about either person alone and more about what the bond tends to create.",
      body: "A composite chart treats the relationship as its own system. {{planetA}} brings {{planetATopic}}. {{planetB}} brings {{planetBTopic}}. The {{aspect}} describes how those themes operate inside the connection: what comes easily, what repeats, and where the relationship may need more conscious handling.",
      bestMove: "Ask what the relationship tends to produce when both people are together. Work with the pattern instead of assigning it to one person.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "friends.composite-placement",
    label: "Friends > Composite Placement",
    surface: "composite",
    domain: "relationship",
    mode: "in_depth",
    description: "Composite chart planet sign and house placements describing the relationship as its own pattern.",
    knowledgeIdTemplates: ["composite-{planet}-house-{house}", "composite-{planet}-house{house}", "composite-{planet}-in-{sign}", "relationship-{planet}-house-{house}", "{planet}-house-{house}"],
    requiredFacts: ["planet", "sign", "house", "relationship context"],
    copy: {
      headline: "Composite {{planet}} in {{sign}}",
      summary: "This placement describes how {{planetTopic}} tends to operate inside the relationship itself, especially through the {{house}} house area.",
      body: "Composite placements describe the relationship as its own living pattern. {{planet}} names the relationship topic. {{sign}} describes the style it moves through. The {{house}} house shows where that pattern becomes concrete in the bond.",
      bestMove: "Read this as a shared pattern. Ask what the relationship tends to create here, then choose the behavior that makes the pattern easier to live with.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "friends.relationship-timing",
    label: "Friends > Relationship Timing",
    surface: "relationship",
    domain: "relationship",
    mode: "feed",
    description: "Current transits and timing cards comparing what each person is carrying.",
    knowledgeIdTemplates: ["transit-natal-{transitPlanet}-{aspect}-{natalPoint}", "relationship-timing-{transitPlanet}", "{transitPlanet}-{aspect}-{natalPoint}"],
    requiredFacts: ["transitPlanet", "aspect", "natalPoint", "person/chart affected"],
    copy: {
      headline: "{{transitPlanet}} {{aspect}} {{person}}'s {{natalPoint}}",
      summary: "Current timing may be pressing on {{person}}'s {{natalPointTopic}}. Before assuming the issue is the relationship, check what this transit is stirring in their chart.",
      body: "Relationship timing is often easier to read when each person's current pressure is named separately. This transit brings {{transitPlanetTopic}} into contact with {{person}}'s {{natalPointTopic}}. Their mood, priorities, or availability may shift while that pattern is active.",
      bestMove: "Start with the activated life area. Ask what is being stirred, what support is useful, and what does not need to be taken personally.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "friends.circle-feed",
    label: "Friends > Circle Feed",
    surface: "friends",
    domain: "relationship",
    mode: "feed",
    description: "Circle overview cards that explain shared timing patterns across multiple friends.",
    knowledgeIdTemplates: ["friends-circle-{topic}", "relationship-circle-{topic}", "{topic}"],
    requiredFacts: ["topic", "people affected", "shared timing pattern"],
    copy: {
      headline: "One question is moving through different lives",
      summary: "More than one person in this group may be moving through {{topic}} right now, but that does not mean they are living the same story.",
      body: "This update looks for repeated timing across multiple charts. When the same topic appears for more than one person, it can describe a shared mood in the group without making everyone's experience identical. One person may meet it through a conversation, another through a deadline, a boundary, a money question, a health issue, or the need for privacy before they can explain what is happening.",
      bestMove: "Name the shared pattern, then keep the response practical: clarify plans, ask directly, lower assumptions, or give people room where the timing calls for it.",
      emptyState: "If no approved content exists, leave the product surface blank."
    }
  },
  {
    key: "settings.life-area-focus",
    label: "Settings > Life Area Focus",
    surface: "settings",
    domain: "natal",
    mode: "system",
    description: "Settings descriptions for career, relationships, family, health, money, and other life-area focus toggles.",
    knowledgeIdTemplates: ["life-area-{topic}", "{topic}"],
    requiredFacts: ["life area topic"],
    copy: {
      headline: "{{lifeArea}}",
      summary: "Use this focus to prioritize astrology connected to {{lifeAreaDescription}}.",
      body: "When this is turned on, TLDR Astro can surface more cards related to {{lifeAreaDescription}}. It does not make the topic more important in your chart; it simply helps the app choose what to show first.",
      bestMove: "Turn it on when this topic is actively on your mind. Turn it off when you want a broader read.",
      emptyState: "Choose the areas of life you want the app to prioritize."
    }
  }
] satisfies FallbackHookDefinition[];

export function fallbackHookByKey(key: string) {
  return fallbackHookDefinitions.find((hook) => hook.key === key) ?? null;
}

export function normalizeFallbackHookPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function knowledgeIdsForFallbackHook(key: string, context: FallbackHookContext = {}) {
  const hook = fallbackHookByKey(key);

  if (!hook) {
    return [];
  }

  return hook.knowledgeIdTemplates
    .map((template) => template.replace(/\{([a-zA-Z0-9]+)\}/g, (_, name: string) => normalizeFallbackHookPart(context[name])))
    .filter((id) => !id.includes("--") && !id.endsWith("-") && !id.startsWith("-") && !id.includes("{}"))
    .filter((id) => !/\{[a-zA-Z0-9]+\}/.test(id));
}
