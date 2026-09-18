export const ASTRO_101_KEY_PREFIX = "education/astro-101/";

export type Astro101Block = {
  heading?: string;
  level?: number;
  body?: string;
  group?: boolean;
  style?: string;
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
      style: typeof entry.style === "string" ? entry.style : ""
    };
  });
}

export function astro101IntroFromSections(sections: unknown) {
  const intro = record(sections)?.intro;
  return typeof intro === "string" ? intro : "";
}

export function astro101KindFromSections(sections: unknown) {
  const kind = record(sections)?.kind;
  return typeof kind === "string" ? kind : "";
}

export function astro101SlugFromFacts(facts: unknown) {
  const slug = record(facts)?.slug;
  return typeof slug === "string" ? slug : "";
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
