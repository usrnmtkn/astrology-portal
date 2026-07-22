import { resolvePersonReference, type PersonReference, type PronounChoice } from "../../services/personReferences";

type RoadmapOwnerKind = "self" | "person" | "chart";

type SoulRoadmapCardProps = {
  className?: string;
  onOpenDetail?: () => void;
  ownerKind?: RoadmapOwnerKind;
  ownerName?: string;
  ownerPronouns?: PronounChoice | null;
  risingPending?: boolean;
  sun: string;
  moon: string;
  northNode?: string;
  rising: string;
};

type SignRoadmap = {
  integratedTheme: string;
  sunExpression: string;
  pathExpression: string;
  moonStyle: string;
  moonContribution: string;
  keywords: string[];
};

type SoulRoadmapLayer = "authored" | "fallback";

export type SoulRoadmapProfile = {
  label: string;
  title: string;
  tldr: string;
  points: Array<{
    label: string;
    value: string;
  }>;
  sections: Array<{
    heading: string;
    body: string;
    layer: SoulRoadmapLayer;
    tier: string;
    sourceKeys: string[];
  }>;
};

const signRoadmaps: Record<string, SignRoadmap> = {
  Aries: {
    integratedTheme: "courage, initiation, and self-directed action",
    sunExpression: "acting on instinct, claiming agency, and fighting for what matters",
    pathExpression: "direct action, honest confrontation, courage, and the willingness to go first",
    moonStyle: "responding quickly, naming what they want, and letting emotion become easier to handle once it has somewhere to go",
    moonContribution: "stay brave enough to act when the mission needs momentum",
    keywords: ["I am", "I fight for", "I take action", "I am strong-willed"]
  },
  Taurus: {
    integratedTheme: "stability, embodiment, value, and lasting security",
    sunExpression: "building something steady, useful, beautiful, and worth protecting",
    pathExpression: "patience, consistency, self-worth, and the slow work of making life feel secure",
    moonStyle: "returning to the body, the senses, and what feels dependable",
    moonContribution: "keep the mission grounded in real needs, real value, and sustainable choices",
    keywords: ["I have", "I value", "I connect with the earth", "I create stability"]
  },
  Gemini: {
    integratedTheme: "curiosity, language, learning, and mental connection",
    sunExpression: "learning, asking questions, translating ideas, and keeping information moving",
    pathExpression: "conversation, adaptability, observation, and the courage to keep asking better questions",
    moonStyle: "thinking out loud, naming the pattern, and processing feelings through words",
    moonContribution: "turn experience into language the mission can use",
    keywords: ["I learn", "I think", "I communicate", "I intellectualize"]
  },
  Cancer: {
    integratedTheme: "care, belonging, memory, and emotional protection",
    sunExpression: "nourishing what matters, protecting what is vulnerable, and creating emotional safety",
    pathExpression: "care, intuition, family patterns, emotional honesty, and the work of learning what needs protection",
    moonStyle: "tracking attachment, memory, and the need to feel emotionally safe. When something affects them, they may first protect themselves or the people they love before they can explain what they feel",
    moonContribution: "protect the heart of the mission without losing contact with what they feel",
    keywords: ["I feel", "I nourish", "I empathize", "I mother"]
  },
  Leo: {
    integratedTheme: "creative visibility, heart, leadership, and self-expression",
    sunExpression: "creating, leading, and becoming visible for what comes from the heart",
    pathExpression: "confidence, creative risk, play, pride, and the work of being seen without performing away the self",
    moonStyle: "needing warmth, recognition, and a sense that their feelings matter",
    moonContribution: "keep the mission alive with courage, generosity, and creative fire",
    keywords: ["I will", "I am creative", "I lead", "I father"]
  },
  Virgo: {
    integratedTheme: "discernment, service, healing, and useful craft",
    sunExpression: "improving what is in front of them, serving well, and making daily practice meaningful",
    pathExpression: "skill-building, refinement, humility, ritual, and attention to what actually works",
    moonStyle: "sorting the details, noticing what is off, and trying to make the feeling useful",
    moonContribution: "turn emotional information into repair, care, and practical next steps",
    keywords: ["I analyze", "I serve", "I heal", "I cultivate", "I ritualize"]
  },
  Libra: {
    integratedTheme: "relationship, fairness, beauty, and balance",
    sunExpression: "building connection, creating harmony, and learning who they are through relationship",
    pathExpression: "partnership, compromise, conflict, fairness, and the work of figuring out where they stand with other people",
    moonStyle: "weighing both sides, seeking fairness, and needing relational clarity before they feel settled",
    moonContribution: "keep the mission connected to justice, reciprocity, and the people it affects",
    keywords: ["I balance", "I relate", "I connect", "I build relationships"]
  },
  Scorpio: {
    integratedTheme: "depth, power, truth, transformation, and emotional honesty",
    sunExpression: "uncovering what is hidden, transforming what is stagnant, and facing what others avoid",
    pathExpression: "trust, intimacy, shadow work, emotional courage, and the willingness to go beneath the obvious story",
    moonStyle: "listening for what is hidden, unspoken, intense, or emotionally charged. They may not trust the first explanation, and they may not feel settled until they understand what is really happening underneath it",
    moonContribution: "point the mission toward the part of the situation people may be avoiding",
    keywords: ["I transform", "I desire", "I feel deeply", "I go deep", "I uncover"]
  },
  Sagittarius: {
    integratedTheme: "meaning, freedom, faith, teaching, and wider perspective",
    sunExpression: "seeking truth, widening the horizon, teaching what they learn, and following the larger meaning",
    pathExpression: "movement, honesty, study, travel, faith, and encounters with perspectives bigger than their starting point",
    moonStyle: "trying to find the larger meaning. When something hurts, they may need space, honesty, movement, or a wider perspective before the feeling starts to make sense",
    moonContribution: "give the mission perspective, honesty, and enough space to keep growing",
    keywords: ["I expand", "I philosophize", "I teach", "I envision", "I understand"]
  },
  Capricorn: {
    integratedTheme: "responsibility, mastery, commitment, and earned respect",
    sunExpression: "building something solid, useful, and respected. Capricorn is not here to drift. It is here to take responsibility, commit to the work, and become someone others can rely on",
    pathExpression: "discipline, patience, ambition, contribution, and the willingness to become reliable over time",
    moonStyle: "organizing the feeling, taking responsibility, and asking what can be done",
    moonContribution: "keep the mission committed, useful, and strong enough to last",
    keywords: ["I utilize", "I contribute", "I work", "I am committed", "I mentor"]
  },
  Aquarius: {
    integratedTheme: "innovation, independence, community, and future-minded change",
    sunExpression: "questioning stale patterns, thinking differently, and making room for what comes next",
    pathExpression: "community, experimentation, friendship, objectivity, and the courage to disrupt inherited patterns",
    moonStyle: "stepping back, looking for the pattern, and needing emotional room to think clearly",
    moonContribution: "keep the mission connected to the future and the people it wants to include",
    keywords: ["I innovate", "I know", "I disrupt", "I change", "I build communities"]
  },
  Pisces: {
    integratedTheme: "imagination, compassion, spirituality, and creative surrender",
    sunExpression: "imagining what could be, creating from sensitivity, and staying connected to spirit, art, or compassion",
    pathExpression: "intuition, faith, creativity, forgiveness, and the work of staying open without dissolving",
    moonStyle: "absorbing the feeling, sensing what is unspoken, and needing gentleness before clarity arrives",
    moonContribution: "keep the mission compassionate, imaginative, and connected to something larger than control",
    keywords: ["I imagine", "I create", "I inspire", "I believe", "I dream"]
  }
};

function cleanSign(value: string) {
  const match = Object.keys(signRoadmaps).find((sign) => new RegExp(`\\b${sign}\\b`, "i").test(value));

  return match ?? "";
}

function possessiveName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "Their";
  }

  return trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
}

function ownerLabel(ownerKind: RoadmapOwnerKind, ownerName = "") {
  if (ownerKind === "self") return "Your";
  if (ownerKind === "chart") return "This chart's";

  return possessiveName(ownerName);
}

function sentenceSubject(ownerKind: RoadmapOwnerKind, ownerName = "") {
  if (ownerKind === "self") return "you";
  if (ownerKind === "chart") return "it";

  return ownerName.trim() || "they";
}

function pronounSet(ownerKind: RoadmapOwnerKind, ownerName = "", ownerPronouns?: PronounChoice | null) {
  if (ownerKind === "self") {
    return {
      possessive: "your",
      subject: "you",
      object: "you",
      verb: "process",
      helps: "helps you"
    };
  }

  if (ownerKind === "chart") {
    return {
      possessive: "its",
      subject: "it",
      object: "it",
      verb: "processes",
      helps: "helps it"
    };
  }

  const reference = resolvePersonReference({ name: ownerName || "they", pronouns: ownerPronouns });

  return {
    possessive: reference.possessiveAdjective,
    subject: reference.subject,
    object: reference.object,
    reflexive: reference.reflexive,
    verb: reference.verbAgreement === "plural" ? "process" : "processes",
    helps: `helps ${reference.object}`,
    reference
  };
}

function formatRoadmapText(value: string, ownerKind: RoadmapOwnerKind, reference?: PersonReference) {
  const replacements = ownerKind === "self"
    ? {
        they: "you",
        them: "you",
        their: "your",
        themselves: "yourself",
        are: "are",
        have: "have"
      }
    : ownerKind === "chart"
      ? {
        they: "it",
        them: "it",
        their: "its",
        themselves: "itself",
        are: "is",
        have: "has"
      }
      : {
        they: reference?.subject ?? "they",
        them: reference?.object ?? "them",
        their: reference?.possessiveAdjective ?? "their",
        themselves: reference?.reflexive ?? "themselves",
        are: reference?.bePresent ?? "are",
        have: reference?.havePresent ?? "have"
      };

  return value
    .replace(/\bthey are\b/g, `${replacements.they} ${replacements.are}`)
    .replace(/\bThey are\b/g, `${replacements.they[0].toUpperCase() + replacements.they.slice(1)} ${replacements.are}`)
    .replace(/\bthey have\b/g, `${replacements.they} ${replacements.have}`)
    .replace(/\bThey have\b/g, `${replacements.they[0].toUpperCase() + replacements.they.slice(1)} ${replacements.have}`)
    .replace(/\bthemselves\b/g, replacements.themselves)
    .replace(/\bThemselves\b/g, replacements.themselves[0].toUpperCase() + replacements.themselves.slice(1))
    .replace(/\btheir\b/g, replacements.their)
    .replace(/\bTheir\b/g, replacements.their[0].toUpperCase() + replacements.their.slice(1))
    .replace(/\bthem\b/g, replacements.them)
    .replace(/\bThem\b/g, replacements.them[0].toUpperCase() + replacements.them.slice(1))
    .replace(/\bthey\b/g, replacements.they)
    .replace(/\bThey\b/g, replacements.they[0].toUpperCase() + replacements.they.slice(1));
}

function signArticle(sign: string) {
  return /^[AEIOU]/.test(sign) ? "an" : "a";
}

function moonMissionSentence({
  moonSign,
  moonStyle,
  moonContribution,
  pronouns
}: {
  moonSign: string;
  moonStyle: string;
  moonContribution: string;
  pronouns: ReturnType<typeof pronounSet>;
}) {
  const moonOpener = `With ${signArticle(moonSign)} ${moonSign} Moon, ${pronouns.subject} ${pronouns.verb} life by ${moonStyle}`;

  if (moonStyle.includes(".")) {
    return `${moonOpener}. This ${pronouns.helps} ${moonContribution}.`;
  }

  return `${moonOpener}, which ${pronouns.helps} ${moonContribution}.`;
}

function moonMissionContributionSentence(moonSign: string, moonContribution: string, pronouns: ReturnType<typeof pronounSet>) {
  if (/^point the mission\b/i.test(moonContribution)) {
    return `The ${moonSign} Moon keeps the mission pointed ${moonContribution.replace(/^point the mission\s*/i, "").trim()}.`;
  }

  if (/^keep the mission\b/i.test(moonContribution)) {
    return `The ${moonSign} Moon ${moonContribution.replace(/^keep\b/i, "keeps")}.`;
  }

  return `The ${moonSign} Moon helps ${pronouns.object} ${moonContribution}.`;
}

function readerFacingRoadmapText(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return "";
  }

  if (/\bmore chart context\b/i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

function normalizedSoulRoadmapSection({
  body,
  heading,
  sourceKeys
}: {
  body: string;
  heading: string;
  sourceKeys: string[];
}) {
  const normalizedBody = readerFacingRoadmapText(body);

  if (!normalizedBody) {
    return null;
  }

  return {
    heading,
    body: normalizedBody,
    layer: "fallback" as const,
    tier: "source-based-local-roadmap",
    sourceKeys
  };
}

function missionStatement({
  moonSign,
  moon,
  northNodeSign,
  northNode,
  ownerKind,
  ownerName,
  ownerPronouns,
  risingSign,
  rising,
  risingPending,
  sunSign,
  sun
}: {
  moonSign: string;
  moon: SignRoadmap;
  northNodeSign: string;
  northNode: SignRoadmap | null;
  ownerKind: RoadmapOwnerKind;
  ownerName?: string;
  ownerPronouns?: PronounChoice | null;
  risingSign: string;
  rising: SignRoadmap | null;
  risingPending: boolean;
  sunSign: string;
  sun: SignRoadmap;
}) {
  const pronouns = pronounSet(ownerKind, ownerName, ownerPronouns);
  const sunExpression = formatRoadmapText(sun.sunExpression, ownerKind, pronouns.reference);
  const moonContribution = formatRoadmapText(moon.moonContribution, ownerKind, pronouns.reference);
  const pathSign = northNodeSign || risingSign;
  const pathRoadmap = northNode ?? rising;
  const pathExpression = pathRoadmap ? formatRoadmapText(pathRoadmap.pathExpression, ownerKind, pronouns.reference) : "";
  const name = sentenceSubject(ownerKind, ownerName);
  const opener = ownerKind === "self"
    ? `Your mission gets clearer when your ${sunSign} Sun can move in its own way.`
    : `${name}'s mission gets clearer when ${pronouns.possessive} ${sunSign} Sun can move in its own way.`;
  const sunSentence = `The fuel is ${sunExpression}.`;
  const pathSentence = pathRoadmap && pathSign
    ? `${pathSign} points the path toward ${pathExpression}.`
    : "";
  const moonSentence = moonMissionContributionSentence(moonSign, moonContribution, pronouns);

  return [opener, sunSentence, pathSentence, moonSentence]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveSoulRoadmapProfile({
  ownerKind = "self",
  ownerName = "",
  ownerPronouns = null,
  risingPending = false,
  sun,
  moon,
  northNode = "",
  rising
}: Omit<SoulRoadmapCardProps, "className" | "onOpenDetail">): SoulRoadmapProfile | null {
  const sunSign = cleanSign(sun);
  const moonSign = cleanSign(moon);
  const northNodeSign = cleanSign(northNode);
  const risingSign = cleanSign(rising);
  const sunRoadmap = sunSign ? signRoadmaps[sunSign] : null;
  const moonRoadmap = moonSign ? signRoadmaps[moonSign] : null;
  const northNodeRoadmap = northNodeSign ? signRoadmaps[northNodeSign] : null;
  const risingRoadmap = risingSign ? signRoadmaps[risingSign] : null;

  if (!sunRoadmap || !moonRoadmap) {
    return null;
  }

  const label = ownerKind === "chart" ? "Chart roadmap" : "Soul's roadmap";
  const pathLabel = northNodeSign || (risingPending || !risingRoadmap ? "Pending" : risingSign);
  const title = ownerKind === "self" ? "Your mission statement" : `${ownerLabel(ownerKind, ownerName)} mission statement`;
  const tldr = missionStatement({
    moonSign,
    moon: moonRoadmap,
    northNodeSign,
    northNode: northNodeRoadmap,
    ownerKind,
    ownerName,
    ownerPronouns,
    risingSign,
    rising: risingRoadmap,
    risingPending: risingPending || !risingRoadmap,
    sunSign,
    sun: sunRoadmap
  });
  const displayName = sentenceSubject(ownerKind, ownerName);
  const pronouns = pronounSet(ownerKind, ownerName, ownerPronouns);
  const sunExpression = formatRoadmapText(sunRoadmap.sunExpression, ownerKind, pronouns.reference);
  const pathRoadmap = northNodeRoadmap ?? risingRoadmap;
  const pathSign = northNodeSign || risingSign;
  const pathExpression = pathRoadmap ? formatRoadmapText(pathRoadmap.pathExpression, ownerKind, pronouns.reference) : "";
  const moonStyle = formatRoadmapText(moonRoadmap.moonStyle, ownerKind, pronouns.reference);
  const purposeHeading = ownerKind === "self" ? "Purpose pattern" : `${displayName}'s purpose pattern`;
  const developmentBody = pathRoadmap && pathSign
    ? `${pathSign} gives this purpose a direction through ${pathExpression}. The ${moonSign} Moon helps it stay honest by ${moonStyle}.`
    : "";
  const sections = [
    normalizedSoulRoadmapSection({
      heading: purposeHeading,
      body: tldr,
      sourceKeys: [
        `soulRoadmap.sign.${sunSign}.sunExpression`,
        `soulRoadmap.sign.${moonSign}.moonStyle`,
        ...(pathSign ? [`soulRoadmap.sign.${pathSign}.pathExpression`] : [])
      ]
    }),
    normalizedSoulRoadmapSection({
      heading: "How it develops",
      body: developmentBody,
      sourceKeys: [
        ...(pathSign ? [`soulRoadmap.sign.${pathSign}.pathExpression`] : []),
        `soulRoadmap.sign.${moonSign}.moonStyle`
      ]
    })
  ].filter((section): section is NonNullable<typeof section> => Boolean(section));

  return {
    label,
    title,
    tldr,
    points: [
      { label: "Sun", value: sunSign },
      { label: "Path", value: pathLabel },
      { label: "Moon", value: moonSign }
    ],
    sections
  };
}

export function SoulRoadmapCard({
  className = "",
  onOpenDetail,
  ownerKind = "self",
  ownerName = "",
  ownerPronouns = null,
  risingPending = false,
  sun,
  moon,
  northNode = "",
  rising
}: SoulRoadmapCardProps) {
  const profile = resolveSoulRoadmapProfile({
    ownerKind,
    ownerName,
    ownerPronouns,
    risingPending,
    sun,
    moon,
    northNode,
    rising
  });

  if (!profile) {
    return null;
  }

  const sourceLayer = profile.sections.some((section) => section.layer === "authored")
    ? "Authored"
    : "Fallback";
  const cardClassName = [
    "soul-roadmap-card",
    onOpenDetail ? "soul-roadmap-card--button" : "",
    className
  ].filter(Boolean).join(" ");
  const content = (
    <>
      <div className="soul-roadmap-card__header">
        <span className="eyebrow section-label">{profile.label}</span>
        <h3>
          {profile.title}
          <span className="soul-roadmap-card__source-badge">{sourceLayer}</span>
        </h3>
        <p>{profile.tldr}</p>
      </div>
    </>
  );

  if (onOpenDetail) {
    return (
      <button className={cardClassName} type="button" aria-label={`Read ${profile.title}`} onClick={onOpenDetail}>
        {content}
      </button>
    );
  }

  return (
    <section className={cardClassName} aria-label={profile.label}>
      <div className="soul-roadmap-card__header">
        <span className="eyebrow section-label">{profile.label}</span>
        <h3>
          {profile.title}
          <span className="soul-roadmap-card__source-badge">{sourceLayer}</span>
        </h3>
        <p>{profile.tldr}</p>
      </div>
      <div className="soul-roadmap-card__points" aria-label="Purpose factors">
        {profile.points.map((point) => (
          <span key={point.label}>
            <strong>{point.label}</strong>
            <em>{point.value}</em>
          </span>
        ))}
      </div>
      <div className="soul-roadmap-card__keywords" aria-label="Purpose reading">
        {profile.sections.map((section) => (
          <p key={section.heading}>
            <strong>{section.heading}</strong>
            <em>{section.layer === "authored" ? "Authored" : "Fallback"}</em>
            {" "}
            {section.body}
          </p>
        ))}
      </div>
    </section>
  );
}
