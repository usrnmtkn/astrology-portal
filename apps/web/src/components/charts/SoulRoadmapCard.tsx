import { resolvePersonReference, type PersonReference, type PronounChoice } from "../../services/personReferences";
import { fallbackV3VocabularyBody } from "../../content/fallbackArchitectureV3Runtime";

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

const roadmapSigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function packageRoadmap(sign: string): SignRoadmap | null {
  const key = sign.toLowerCase();
  const integratedTheme = fallbackV3VocabularyBody(`fallback-vocab/roadmap-theme/${key}`);
  const sunExpression = fallbackV3VocabularyBody(`fallback-vocab/roadmap-sun/${key}`);
  const pathExpression = fallbackV3VocabularyBody(`fallback-vocab/roadmap-path/${key}`);
  const moonStyle = fallbackV3VocabularyBody(`fallback-vocab/roadmap-moon-style/${key}`);
  const moonContribution = fallbackV3VocabularyBody(`fallback-vocab/roadmap-moon-contribution/${key}`);
  const motto = fallbackV3VocabularyBody(`fallback-vocab/roadmap-motto/${key}`);

  if (!integratedTheme || !sunExpression || !pathExpression || !moonStyle || !moonContribution || !motto) {
    return null;
  }

  return { integratedTheme, sunExpression, pathExpression, moonStyle, moonContribution, keywords: [motto] };
}

const packageRoadmaps: Record<string, SignRoadmap> = Object.fromEntries(
  roadmapSigns.flatMap((sign) => {
    const roadmap = packageRoadmap(sign);
    return roadmap ? [[sign, roadmap]] : [];
  })
);

function cleanSign(value: string) {
  const match = Object.keys(packageRoadmaps).find((sign) => new RegExp(`\\b${sign}\\b`, "i").test(value));

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
  const sunRoadmap = sunSign ? packageRoadmaps[sunSign] : null;
  const moonRoadmap = moonSign ? packageRoadmaps[moonSign] : null;
  const northNodeRoadmap = northNodeSign ? packageRoadmaps[northNodeSign] : null;
  const risingRoadmap = risingSign ? packageRoadmaps[risingSign] : null;

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
