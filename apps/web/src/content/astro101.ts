import {
  astro101HasUnresolvedEphemerisSlot,
  fillAstro101EphemerisSlots
} from "./astro101Ephemeris.ts";

export const ASTRO_101_KEY_PREFIX = "education/astro-101/";

export const ASTRO_101_KINDS = [
  "chapter",
  "article",
  "house",
  "sign",
  "planet",
  "point",
  "aspect",
  "retrograde",
  "phase",
  "resources"
] as const;

export type Astro101Kind = (typeof ASTRO_101_KINDS)[number];

export const ASTRO_101_KIND_LABELS: Record<Astro101Kind, string> = {
  chapter: "Chapter",
  article: "Article",
  house: "House",
  sign: "Sign",
  planet: "Planet",
  point: "Point",
  aspect: "Aspect",
  retrograde: "Retrograde",
  phase: "Moon phase",
  resources: "Resources"
};

export const ASTRO_101_HUB_TITLES: Record<Astro101Kind, string> = {
  chapter: "Chapters",
  article: "Articles",
  house: "The twelve houses",
  sign: "The twelve signs",
  planet: "The planets",
  point: "Angles, points and asteroids",
  aspect: "The aspects",
  retrograde: "The retrogrades",
  phase: "The lunar phases",
  resources: "Resources"
};

export function isAstro101Kind(value: unknown): value is Astro101Kind {
  return typeof value === "string" && (ASTRO_101_KINDS as readonly string[]).includes(value);
}

export type Astro101List = {
  ordered: boolean;
  items: string[];
};

export type Astro101Block = {
  heading?: string;
  level?: number;
  body?: string;
  group?: boolean;
  style?: string;
  list?: Astro101List[];
};

export type Astro101RelatedLink = {
  label: string;
  content_key: string;
  slug: string;
};

export function isAstro101ContentKey(contentKey: string) {
  return contentKey.startsWith(ASTRO_101_KEY_PREFIX);
}

export function isStandaloneLearnPath(pathname: string) {
  return pathname === "/learn" || pathname.startsWith("/learn/");
}

export function astro101LocationState(pathname: string) {
  if (pathname === "/learn" || pathname === "/learn/" || pathname === "/learn/astro-101" || pathname === "/learn/astro-101/") {
    return { hub: true as const, slug: null };
  }
  if (pathname.startsWith("/learn/")) {
    return { hub: false as const, slug: pathname.replace(/\/+$/u, "") };
  }
  return null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function astro101BlocksFromSections(sections: unknown): Astro101Block[] {
  const sectionsRecord = record(sections);
  const blocks = sectionsRecord?.blocks;
  if (!Array.isArray(blocks)) return [];
  return blocks.map((block) => {
    const entry = record(block) ?? {};
    return {
      heading: typeof entry.heading === "string" ? entry.heading : "",
      level: typeof entry.level === "number" ? entry.level : 2,
      body: typeof entry.body === "string" ? entry.body : "",
      group: entry.group === true,
      style: typeof entry.style === "string" ? entry.style : "",
      list: astro101ListsFromUnknown(entry.list)
    };
  });
}

export function astro101IntroFromSections(sections: unknown) {
  const intro = record(sections)?.intro;
  return typeof intro === "string" ? intro : "";
}

export function astro101KindFromSections(sections: unknown): Astro101Kind | "" {
  const kind = record(sections)?.kind;
  return isAstro101Kind(kind) ? kind : "";
}

export function astro101HubTitleFromSections(sections: unknown, kind: Astro101Kind | "") {
  const title = record(sections)?.hubTitle;
  if (typeof title === "string" && title.trim()) return title.trim();
  return kind ? ASTRO_101_HUB_TITLES[kind] : "";
}

export function astro101SlugFromFacts(facts: unknown) {
  const slug = record(facts)?.slug;
  return typeof slug === "string" ? slug : "";
}

export function astro101SlugTail(facts: unknown) {
  const slug = astro101SlugFromFacts(facts).replace(/\/+$/u, "");
  if (!slug) return "";
  return slug.split("/").filter(Boolean).at(-1) ?? "";
}

export function astro101PageIsServable(row: {
  headline?: string | null;
  body?: string | null;
  sections?: unknown;
  facts?: unknown;
}) {
  const filled = fillAstro101EphemerisSlots(row);
  if (
    astro101HasUnresolvedEphemerisSlot(filled.headline)
    || astro101HasUnresolvedEphemerisSlot(filled.body)
    || astro101HasUnresolvedEphemerisSlot(filled.sections)
  ) {
    return false;
  }
  return Boolean((filled.headline ?? "").trim() && astro101SlugFromFacts(filled.facts) && astro101HasReaderCopy(filled));
}

export function astro101PublicationIssue(row: {
  contentKey?: string | null;
  content_key?: string | null;
  surface?: string | null;
  headline?: string | null;
  body?: string | null;
  sections?: unknown;
  facts?: unknown;
}) {
  const key = row.content_key ?? row.contentKey ?? "";
  if (!isAstro101ContentKey(key) && row.surface !== "education") return null;
  if (!(row.headline ?? "").trim()) {
    return "Astro 101 pages need a title before they can be published.";
  }
  if (!astro101SlugFromFacts(row.facts)) {
    return "Astro 101 pages need a reader path before they can be published.";
  }
  if (!astro101HasReaderCopy(row)) {
    return "Write the article before publishing. Empty Astro 101 pages stay drafts.";
  }
  const filled = fillAstro101EphemerisSlots(row);
  if (
    astro101HasUnresolvedEphemerisSlot(filled.headline)
    || astro101HasUnresolvedEphemerisSlot(filled.body)
    || astro101HasUnresolvedEphemerisSlot(filled.sections)
    || astro101HasUnresolvedEphemerisSlot(filled.facts)
  ) {
    return "Resolve calculated ephemeris slots before publishing Astro 101 pages.";
  }
  return null;
}

export function astro101Slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 64);
}

export function astro101ContentKey(kind: Astro101Kind, slug: string) {
  const safe = astro101Slugify(slug) || "new-page";
  return `${ASTRO_101_KEY_PREFIX}${kind}/${safe}`;
}

export function astro101ReaderPath(kind: Astro101Kind, slug: string) {
  const safe = astro101Slugify(slug) || "new-page";
  if (kind === "house" && /^\d{1,2}$/u.test(safe)) return `/learn/houses/${safe}`;
  if (kind === "sign") return `/learn/signs/${safe}`;
  if (kind === "point") return `/learn/points/${safe}`;
  if (kind === "retrograde") return `/learn/retrogrades/${safe}`;
  if (kind === "phase") return `/learn/moon/${safe}`;
  return `/learn/astro-101/${safe}`;
}

export function astro101ResolvedReaderPath(contentKey: string, facts: unknown) {
  const slug = astro101SlugFromFacts(facts).trim();
  if (slug.startsWith("/learn/")) return slug;
  const match = contentKey.match(/^education\/astro-101\/([^/]+)\/(.+)$/u);
  if (match && isAstro101Kind(match[1])) return astro101ReaderPath(match[1], match[2]);
  return slug;
}

export function astro101IsLiveOnLearn(row: {
  content_key?: string | null;
  contentKey?: string | null;
  surface?: string | null;
  status?: string | null;
  lane?: string | null;
  review_state?: string | null;
  headline?: string | null;
  body?: string | null;
  sections?: unknown;
  facts?: unknown;
}) {
  const key = row.content_key ?? row.contentKey ?? "";
  if (!isAstro101ContentKey(key) && row.surface !== "education") return false;
  if ((row.status ?? "").toUpperCase() !== "LIVE") return false;
  if ((row.lane ?? "serving") !== "serving") return false;
  if (row.review_state) return false;
  const facts = record(row.facts) ?? {};
  return astro101PageIsServable({
    headline: row.headline,
    body: row.body,
    sections: row.sections,
    facts: { ...facts, slug: astro101ResolvedReaderPath(key, facts) }
  });
}

export function astro101HasReaderCopy(row: {
  body?: string | null;
  sections?: unknown;
}) {
  if ((row.body ?? "").trim()) return true;
  if (astro101IntroFromSections(row.sections).trim()) return true;
  return astro101BlocksFromSections(row.sections).some((block) => {
    if ((block.body ?? "").trim()) return true;
    return (block.list ?? []).some((list) => list.items.some((item) => item.trim()));
  });
}

function astro101ListsFromUnknown(value: unknown): Astro101List[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const lists = value.flatMap((item) => {
    const entry = record(item);
    if (!entry || !Array.isArray(entry.items)) return [];
    const items = entry.items.filter((line): line is string => typeof line === "string" && line.trim().length > 0);
    if (!items.length) return [];
    return [{ ordered: entry.ordered === true, items }];
  });
  return lists.length ? lists : undefined;
}

export function astro101RelatedFromFacts(facts: unknown): Astro101RelatedLink[] {
  const related = record(facts)?.related;
  if (!Array.isArray(related)) return [];
  return related.flatMap((item) => {
    const entry = record(item);
    if (!entry) return [];
    const label = typeof entry.label === "string" ? entry.label : "";
    const contentKey = typeof entry.content_key === "string" ? entry.content_key : "";
    const slug = typeof entry.slug === "string" ? entry.slug : "";
    if (!label || !slug) return [];
    return [{ label, content_key: contentKey, slug }];
  });
}

export function astro101BodyFromSections(sections: unknown) {
  const intro = astro101IntroFromSections(sections);
  const blocks = astro101BlocksFromSections(sections);
  const parts = [
    intro,
    ...blocks.map((block) => [block.heading, block.body].filter(Boolean).join("\n"))
  ].filter((part) => part.trim());
  return parts.join("\n\n");
}
