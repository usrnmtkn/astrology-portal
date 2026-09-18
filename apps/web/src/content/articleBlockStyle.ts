export const ARTICLE_BLOCK_STYLES = [
  "p",
  "lede",
  "h2",
  "note",
  "callout",
  "placement",
  "affirmation"
] as const;

export type ArticleBlockStyle = (typeof ARTICLE_BLOCK_STYLES)[number];

export const ARTICLE_BLOCK_STYLE_LABELS: Record<ArticleBlockStyle, string> = {
  p: "P",
  lede: "Lede",
  h2: "H2",
  note: "Note",
  callout: "Callout",
  placement: "Placement",
  affirmation: "Affirmation"
};

const PLACEMENT_HEADING = /^(The )?(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Chiron|Uranus|Neptune|Pluto|North Node|South Node)\b/i;

export function isArticleBlockStyle(value: unknown): value is ArticleBlockStyle {
  return typeof value === "string" && (ARTICLE_BLOCK_STYLES as readonly string[]).includes(value);
}

export function articleBlockStyleFromUnknown(value: unknown): ArticleBlockStyle | "" {
  return isArticleBlockStyle(value) ? value : "";
}

export function inferArticleBlockStyle(block: {
  heading?: string;
  body?: string;
  group?: boolean;
  style?: unknown;
}): ArticleBlockStyle {
  const explicit = articleBlockStyleFromUnknown(block.style);
  if (explicit) return explicit;
  const heading = (block.heading ?? "").trim();
  const body = (block.body ?? "").trim();
  if (/^affirmation\b/i.test(heading)) return "affirmation";
  if (/^note\b/i.test(heading) || /^note:/i.test(body)) return "note";
  if (/^callout\b/i.test(heading)) return "callout";
  if (PLACEMENT_HEADING.test(heading)) return "placement";
  if (heading) return "h2";
  return "p";
}

export function placementPlanetFromHeading(heading: string) {
  const match = heading.trim().match(PLACEMENT_HEADING);
  return match?.[2] ?? "";
}

export function noteTextFromBody(body: string) {
  return body.replace(/^note:\s*/i, "").trim();
}

export function splitIntroParagraphs(intro: string) {
  const paragraphs = intro.split(/\n\n+/u).map((part) => part.trim()).filter(Boolean);
  const notes: string[] = [];
  const prose: string[] = [];
  for (const paragraph of paragraphs) {
    if (/^note:/i.test(paragraph)) notes.push(noteTextFromBody(paragraph));
    else prose.push(paragraph);
  }
  return {
    lede: prose[0] ?? "",
    paragraphs: prose.slice(1),
    notes
  };
}
