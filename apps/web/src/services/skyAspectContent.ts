import { isReaderFacingCopy } from "../content/readerSafety";
import type { LiveGeneratedContent } from "./generatedContent";
import { skyAspectInstanceContentKey, slugContentPart } from "./generatedContentKeys";

const collectiveSkyAspectBodyOrder = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "lilith",
  "nodes"
];

function canonicalCollectiveSkyPoint(value: string) {
  const point = slugContentPart(value);
  return ["north-node", "south-node", "true-node", "node", "nodes", "lunar-nodes"].includes(point)
    ? "nodes"
    : point === "black-moon-lilith"
      ? "lilith"
      : point;
}

type ResolveSkyAspectContentOptions = {
  generatedContent: Map<string, LiveGeneratedContent>;
  first: string;
  second: string;
  aspect: string;
  firstSign: string;
  secondSign: string;
  targetDate?: string | null;
};

type SkyAspectContentKeyOptions = Omit<ResolveSkyAspectContentOptions, "generatedContent">;

type ExpectedSkyAspectFacts = {
  a: string;
  b: string;
  aspect: string;
  signA: string;
  signB: string;
  pairKey: string;
  pairSource: string;
};

function recordField(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function skyAspectBody(content: LiveGeneratedContent) {
  return content.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n");
}

function normalizedCollectiveSkyAspectFacts({
  first,
  second,
  aspect,
  firstSign,
  secondSign
}: Omit<ResolveSkyAspectContentOptions, "generatedContent" | "targetDate">): ExpectedSkyAspectFacts | null {
  const normalizedFirst = canonicalCollectiveSkyPoint(first);
  const normalizedSecond = canonicalCollectiveSkyPoint(second);
  const normalizedAspect = slugContentPart(aspect);
  const normalizedFirstSign = slugContentPart(firstSign);
  const normalizedSecondSign = slugContentPart(secondSign);
  const firstIndex = collectiveSkyAspectBodyOrder.indexOf(normalizedFirst);
  const secondIndex = collectiveSkyAspectBodyOrder.indexOf(normalizedSecond);

  if (
    firstIndex < 0
    || secondIndex < 0
    || firstIndex === secondIndex
    || !["conjunction", "sextile", "square", "trine", "quincunx", "opposition"].includes(normalizedAspect)
    || !normalizedFirstSign
    || !normalizedSecondSign
  ) {
    return null;
  }

  const [a, b, signA, signB] = firstIndex < secondIndex
    ? [normalizedFirst, normalizedSecond, normalizedFirstSign, normalizedSecondSign]
    : [normalizedSecond, normalizedFirst, normalizedSecondSign, normalizedFirstSign];

  return {
    a,
    b,
    aspect: normalizedAspect,
    signA,
    signB,
    pairKey: `${a}-${b}`,
    pairSource: `data/pairs/${a}-${b}.json`
  };
}

function generatedSkyAspectCardPassesBoundary(
  content: LiveGeneratedContent,
  expected: ExpectedSkyAspectFacts
) {
  const source = content.sourceSnapshot ?? {};
  const lint = recordField(source.skyAspectVoiceLint);
  const facts = recordField(source.cardFacts);
  const body = skyAspectBody(content);
  const containsMechanics = /\b(?:orb|degrees?)\b|°/i.test(body);
  const containsDate = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b|\b20\d{2}\b|\b\d{4}-\d{2}-\d{2}\b/i.test(body);
  const containsInternalMetadata = /\b(?:provenance|linter|lint score|editorial status|draft status|review queue)\b/i.test(body);

  return Boolean(
    body
    && isReaderFacingCopy(body)
    && !containsMechanics
    && !containsDate
    && !containsInternalMetadata
    && lint?.score === 3
    && lint?.fails === 0
    && content.judgeScore === 3
    && content.judgeGate === "auto-publish"
    && source.pairSource === expected.pairSource
    && source.pairKey === expected.pairKey
    && facts?.a === expected.a
    && facts?.b === expected.b
    && facts?.aspect === expected.aspect
    && facts?.signA === expected.signA
    && facts?.signB === expected.signB
  );
}

function skyAspectContentKeysFromExpected(expected: ExpectedSkyAspectFacts, targetDate?: string | null) {
  const evergreenKey = skyAspectInstanceContentKey(expected.a, expected.aspect, expected.b, {
    firstSign: expected.signA,
    secondSign: expected.signB
  });
  const datedKey = targetDate
    ? skyAspectInstanceContentKey(expected.a, expected.aspect, expected.b, {
        firstSign: expected.signA,
        secondSign: expected.signB,
        targetDate
      })
    : "";

  return [evergreenKey, datedKey].filter(Boolean);
}

export function skyAspectGeneratedContentKeys(options: SkyAspectContentKeyOptions) {
  const expected = normalizedCollectiveSkyAspectFacts(options);

  return expected ? skyAspectContentKeysFromExpected(expected, options.targetDate) : [];
}

export function resolveSkyAspectGeneratedContent(options: ResolveSkyAspectContentOptions) {
  const expected = normalizedCollectiveSkyAspectFacts(options);

  if (!expected) {
    return null;
  }

  const content = skyAspectContentKeysFromExpected(expected, options.targetDate)
    .map((key) => options.generatedContent.get(key))
    .find((candidate): candidate is LiveGeneratedContent => Boolean(
      candidate && generatedSkyAspectCardPassesBoundary(candidate, expected)
    ));

  if (!content) {
    return null;
  }

  return {
    body: skyAspectBody(content),
    content,
    pairSource: expected.pairSource
  };
}
