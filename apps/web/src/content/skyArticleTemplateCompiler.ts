export const SKY_ARTICLE_TEMPLATE_SCHEMA = "tldrastro-sky-article-template-v1";
export const SKY_ARTICLE_EDITION_SCHEMA = "tldrastro-sky-article-edition-v1";
export const SKY_ARTICLE_COMPILER_VERSION = "sky-article-template-compiler-v1";

export type SkyArticleTemplatePlaceholder = {
  description: string;
  name: string;
  token: string;
};

export type SkyArticleHousePassage = {
  body: string;
  contentKey: string;
  house: number;
  risingSign?: string | null;
};

export type SkyArticleAspectPassage = {
  aspect: string;
  body: string;
  contentKey: string;
  natalPoint: string;
};

export type SkyArticleSection = {
  body: string;
  heading: string;
};

export type CompileSkyArticleEditionInput = {
  aspectPassages?: SkyArticleAspectPassage[];
  entryYear: number;
  housePassages: SkyArticleHousePassage[];
  planet: string;
  sign: string;
  slotValues: Record<string, string>;
  templateBody: string;
  templateKey: string;
  transitEndInstant: string;
  transitStartInstant: string;
  validFrom: string;
  validTo: string;
};

export type CompiledSkyArticleEdition = {
  articleSections: SkyArticleSection[];
  aspectPassages: SkyArticleAspectPassage[];
  body: string;
  compiledHash: string;
  compiledMarkdown: string;
  contentKey: string;
  entryYear: number;
  fixedProseHash: string;
  headline: string;
  housePassages: SkyArticleHousePassage[];
  planet: string;
  schema: typeof SKY_ARTICLE_EDITION_SCHEMA;
  sign: string;
  slotValues: Record<string, string>;
  templateHash: string;
  templateKey: string;
  transitEndInstant: string;
  transitStartInstant: string;
  validFrom: string;
  validTo: string;
};

export type SkyArticleEditionCandidate = {
  contentKey: string;
  id: string;
  sections: unknown;
  sourceSnapshot?: Record<string, unknown> | null;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const aspectGroups: Record<string, string> = {
  conjunction: "conjunction",
  square: "hard",
  opposition: "hard",
  trine: "soft",
  sextile: "soft"
};
const heavyAspectBodies = new Set(["saturn", "uranus", "neptune", "pluto", "chiron"]);

function normalizeNewlines(value: string) {
  return value.replace(/\r\n?/gu, "\n");
}

function compactBlankLines(value: string) {
  return value.replace(/[ \t]+$/gmu, "").replace(/\n{3,}/gu, "\n\n").trim();
}

function titleCaseToken(value: string) {
  return value.split("-").map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join(" ");
}

export function extractSkyArticleTemplateBody(source: string) {
  const normalized = normalizeNewlines(source);
  const partOne = normalized.match(/(?:^|\n)## PART 1[^\n]*\n([\s\S]*?)(?=\n---\n\s*## PART 2\b|\n## PART 2\b|\s*$)/u)?.[1];
  const firstDivider = normalized.indexOf("\n---\n");
  const afterPreamble = firstDivider >= 0 ? normalized.slice(firstDivider + 5) : normalized;
  const fallback = afterPreamble.match(/(?:^|\n)## PART 1[^\n]*\n([\s\S]*?)(?=\n---\n\s*## PART 2\b|\n## PART 2\b|\s*$)/u)?.[1]
    ?? afterPreamble;

  return compactBlankLines(partOne ?? fallback);
}

function balancedMustacheTokens(source: string) {
  const tokens: string[] = [];
  let cursor = 0;

  while (cursor < source.length - 1) {
    const start = source.indexOf("{{", cursor);
    if (start < 0) break;
    let depth = 1;
    let index = start + 2;
    while (index < source.length - 1 && depth > 0) {
      if (source.startsWith("{{", index)) {
        depth += 1;
        index += 2;
        continue;
      }
      if (source.startsWith("}}", index)) {
        depth -= 1;
        index += 2;
        continue;
      }
      index += 1;
    }
    if (depth !== 0) {
      throw new Error("Sky article template contains an unclosed {{placeholder}}.");
    }
    tokens.push(source.slice(start, index));
    cursor = index;
  }

  return tokens;
}

function placeholderFromToken(token: string): SkyArticleTemplatePlaceholder {
  const inner = token.slice(2, -2).trim();
  const nestedStart = inner.indexOf("{{");
  const topLevel = nestedStart >= 0 ? inner.slice(0, nestedStart).trim() : inner;
  const colon = topLevel.indexOf(":");
  const name = (colon >= 0 ? topLevel.slice(0, colon) : topLevel).trim();
  const description = (colon >= 0 ? topLevel.slice(colon + 1) : "").trim();

  if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(name)) {
    throw new Error(`Unsupported Sky article placeholder ${token}.`);
  }

  return { description, name, token };
}

export function skyArticleTemplatePlaceholders(source: string) {
  const byName = new Map<string, SkyArticleTemplatePlaceholder>();
  for (const token of balancedMustacheTokens(extractSkyArticleTemplateBody(source))) {
    const placeholder = placeholderFromToken(token);
    if (!byName.has(placeholder.name)) byName.set(placeholder.name, placeholder);
  }
  return [...byName.values()];
}

function replaceTemplateTokens(source: string, values: Record<string, string>) {
  let output = source;
  for (const token of balancedMustacheTokens(source)) {
    const placeholder = placeholderFromToken(token);
    const value = values[placeholder.name];
    if (value === undefined) continue;
    output = output.replace(token, value);
  }
  return output;
}

function markdownSections(markdown: string): SkyArticleSection[] {
  const lines = normalizeNewlines(markdown).split("\n");
  const sections: SkyArticleSection[] = [];
  let heading = "Overview";
  let body: string[] = [];

  const flush = () => {
    const text = compactBlankLines(body.join("\n"));
    if (text) sections.push({ heading, body: text });
    body = [];
  };

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/u);
    if (match) {
      flush();
      heading = match[1].trim();
    } else {
      body.push(line);
    }
  }
  flush();
  return sections;
}

function articleBodyBeforeHoroscopes(markdown: string) {
  return compactBlankLines(markdown
    .replace(/^Jump to Horoscopes\s*$/gmu, "")
    .split(/^## Horoscopes\b.*$/mu)[0] ?? "");
}

function withoutFirstHeading(markdown: string) {
  return compactBlankLines(markdown.replace(/^#\s+[^\n]+\n?/u, ""));
}

function uniqueByContentKey<T extends { contentKey: string }>(values: T[]) {
  const byKey = new Map(values.map((value) => [value.contentKey, value]));
  return [...byKey.values()];
}

function assertEditionInput(input: CompileSkyArticleEditionInput) {
  if (!slugPattern.test(input.planet) || !slugPattern.test(input.sign)) {
    throw new Error("Sky article planet and sign must use lowercase slug values.");
  }
  if (!Number.isInteger(input.entryYear) || input.entryYear < 1900 || input.entryYear > 2200) {
    throw new Error("Sky article entryYear must be a four-digit year.");
  }
  if (!datePattern.test(input.validFrom) || !datePattern.test(input.validTo) || input.validFrom > input.validTo) {
    throw new Error("Sky article validity dates must be an ordered YYYY-MM-DD range supplied by the calculation layer.");
  }
  const transitStart = new Date(input.transitStartInstant).getTime();
  const transitEnd = new Date(input.transitEndInstant).getTime();
  if (!Number.isFinite(transitStart) || !Number.isFinite(transitEnd) || transitStart >= transitEnd) {
    throw new Error("Sky article transit instants must be an ordered ephemeris window.");
  }
  if (!/^sky\/article-template\//u.test(input.templateKey)) {
    throw new Error("Sky article editions must be compiled from a sky/article-template/* row.");
  }

  const houses = new Set(input.housePassages.map((passage) => passage.house));
  const missingHouses = Array.from({ length: 12 }, (_, index) => index + 1).filter((house) => !houses.has(house));
  if (missingHouses.length) {
    throw new Error(`Sky article edition is missing house horoscopes: ${missingHouses.join(", ")}.`);
  }
  for (const passage of input.housePassages) {
    if (!Number.isInteger(passage.house) || passage.house < 1 || passage.house > 12 || !passage.body.trim()) {
      throw new Error("Every Sky article house horoscope must have a house from 1 through 12 and non-empty copy.");
    }
  }
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function compileSkyArticleEdition(input: CompileSkyArticleEditionInput): Promise<CompiledSkyArticleEdition> {
  assertEditionInput(input);
  const templateBody = extractSkyArticleTemplateBody(input.templateBody);
  const placeholders = skyArticleTemplatePlaceholders(templateBody);
  const slotValues: Record<string, string> = {
    ...input.slotValues,
    sign: input.slotValues.sign || titleCaseToken(input.sign),
    risingBlocks: input.housePassages
      .slice()
      .sort((left, right) => left.house - right.house)
      .map((passage) => `### ${passage.risingSign ? `${titleCaseToken(passage.risingSign)} & ${titleCaseToken(passage.risingSign)} Rising` : `${passage.house}${passage.house === 1 ? "st" : passage.house === 2 ? "nd" : passage.house === 3 ? "rd" : "th"} House`}\n\n${passage.body.trim()}`)
      .join("\n\n")
  };
  const missingSlots = placeholders
    .filter((placeholder) => slotValues[placeholder.name] === undefined)
    .map((placeholder) => placeholder.name);
  if (missingSlots.length) {
    throw new Error(`Sky article edition is missing template values: ${missingSlots.join(", ")}.`);
  }

  const compiledMarkdown = compactBlankLines(replaceTemplateTokens(templateBody, slotValues));
  const unresolved = balancedMustacheTokens(compiledMarkdown).map((token) => placeholderFromToken(token).name);
  if (unresolved.length) {
    throw new Error(`Sky article edition still contains unresolved placeholders: ${unresolved.join(", ")}.`);
  }
  const headline = compiledMarkdown.match(/^#\s+(.+)$/mu)?.[1]?.trim();
  if (!headline) throw new Error("Compiled Sky article edition is missing its H1 headline.");

  const generalMarkdown = withoutFirstHeading(articleBodyBeforeHoroscopes(compiledMarkdown));
  if (!generalMarkdown) throw new Error("Compiled Sky article edition has no reader-facing article body.");
  const housePassages = uniqueByContentKey(input.housePassages).sort((left, right) => left.house - right.house);
  const aspectPassages = uniqueByContentKey(input.aspectPassages ?? []);
  const compiledHash = await sha256(JSON.stringify({ compiledMarkdown, housePassages, aspectPassages }));

  return {
    schema: SKY_ARTICLE_EDITION_SCHEMA,
    contentKey: `sky-article/${input.planet}/${input.sign}/${input.entryYear}`,
    templateKey: input.templateKey,
    templateHash: await sha256(normalizeNewlines(input.templateBody)),
    fixedProseHash: await sha256(templateBody),
    compiledHash,
    planet: input.planet,
    sign: input.sign,
    entryYear: input.entryYear,
    validFrom: input.validFrom,
    validTo: input.validTo,
    transitStartInstant: input.transitStartInstant,
    transitEndInstant: input.transitEndInstant,
    headline,
    body: generalMarkdown,
    articleSections: markdownSections(generalMarkdown),
    housePassages,
    aspectPassages,
    slotValues,
    compiledMarkdown
  };
}

export function skyArticleEditionRecord(value: unknown): CompiledSkyArticleEdition | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<CompiledSkyArticleEdition>;
  return record.schema === SKY_ARTICLE_EDITION_SCHEMA
    && typeof record.contentKey === "string"
    && typeof record.templateKey === "string"
    && typeof record.templateHash === "string"
    && typeof record.fixedProseHash === "string"
    && typeof record.compiledHash === "string"
    && typeof record.planet === "string"
    && typeof record.sign === "string"
    && typeof record.entryYear === "number"
    && typeof record.validFrom === "string"
    && typeof record.validTo === "string"
    && typeof record.transitStartInstant === "string"
    && typeof record.transitEndInstant === "string"
    && typeof record.headline === "string"
    && typeof record.body === "string"
    && Array.isArray(record.articleSections)
    && Array.isArray(record.housePassages)
    && Array.isArray(record.aspectPassages)
      ? record as CompiledSkyArticleEdition
      : null;
}

export function assertCompiledSkyArticleEdition(value: unknown) {
  const edition = skyArticleEditionRecord(value);
  if (!edition) throw new Error("Sky article edition is missing its compiled edition record.");
  if (!datePattern.test(edition.validFrom) || !datePattern.test(edition.validTo) || edition.validFrom > edition.validTo) {
    throw new Error("Sky article edition has an invalid calculated validity window.");
  }
  const transitStart = new Date(edition.transitStartInstant).getTime();
  const transitEnd = new Date(edition.transitEndInstant).getTime();
  if (!Number.isFinite(transitStart) || !Number.isFinite(transitEnd) || transitStart >= transitEnd) {
    throw new Error("Sky article edition has an invalid calculated transit window.");
  }
  if (balancedMustacheTokens([edition.headline, edition.body, edition.compiledMarkdown].join("\n")).length) {
    throw new Error("Sky article edition contains unresolved template placeholders.");
  }
  const houses = new Set(edition.housePassages.map((passage) => passage.house));
  if (houses.size !== 12 || Array.from({ length: 12 }, (_, index) => index + 1).some((house) => !houses.has(house))) {
    throw new Error("Sky article edition must contain approved horoscopes for all 12 houses.");
  }
  return edition;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function hasExactSkyArticleOwnerApproval(
  edition: CompiledSkyArticleEdition,
  sourceSnapshot: Record<string, unknown> | null | undefined
) {
  const approval = record(sourceSnapshot?.ownerApproval);
  return approval?.approved === true
    && approval.action === "approve-sky-article-edition"
    && approval.contentKey === edition.contentKey
    && approval.templateKey === edition.templateKey
    && approval.templateHash === edition.templateHash
    && approval.fixedProseHash === edition.fixedProseHash
    && approval.compiledHash === edition.compiledHash;
}

export function selectActiveSkyArticleEdition(
  candidates: Iterable<SkyArticleEditionCandidate>,
  context: { activeInstant: string; planet: string; sign: string }
) {
  const activeInstant = new Date(context.activeInstant).getTime();
  if (!Number.isFinite(activeInstant)) throw new Error("Active Sky article selection requires a valid instant.");
  const seen = new Set<string>();
  return [...candidates].flatMap((content) => {
    if (seen.has(content.id)) return [];
    seen.add(content.id);
    const sections = record(content.sections);
    const edition = skyArticleEditionRecord(sections?.skyArticleEdition);
    return edition
      && content.contentKey === edition.contentKey
      && hasExactSkyArticleOwnerApproval(edition, content.sourceSnapshot)
      && edition.planet === context.planet
      && edition.sign === context.sign
      && new Date(edition.transitStartInstant).getTime() <= activeInstant
      && new Date(edition.transitEndInstant).getTime() > activeInstant
      ? [{ content, edition }]
      : [];
  }).sort((left, right) => right.edition.validFrom.localeCompare(left.edition.validFrom))[0] ?? null;
}

export function skyArticleAspectPassageForTransit(
  passages: SkyArticleAspectPassage[],
  context: { aspect: string; natalPoint: string; transitingPlanet: string }
) {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/[_\s]+/gu, "-");
  const aspect = normalize(context.aspect);
  const natalPoint = normalize(context.natalPoint);
  const transitingPlanet = normalize(context.transitingPlanet);
  const group = aspectGroups[aspect] ?? aspect;
  const aspectOrder = [aspect];
  if (group !== aspect) aspectOrder.push(group);
  if (aspect === "conjunction") {
    const heavy = heavyAspectBodies.has(transitingPlanet) || heavyAspectBodies.has(natalPoint);
    aspectOrder.push(...(heavy ? ["hard", "soft"] : ["soft", "hard"]));
  }
  aspectOrder.push("any");

  for (const candidateAspect of [...new Set(aspectOrder)]) {
    const passage = passages.find((candidate) => (
      [natalPoint, "any"].includes(normalize(candidate.natalPoint))
      && normalize(candidate.aspect) === candidateAspect
    ));
    if (passage) return passage;
  }
  return null;
}
