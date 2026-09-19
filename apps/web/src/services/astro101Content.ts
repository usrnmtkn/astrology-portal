import { getSupabaseClient } from "./auth";
import {
  astro101BlocksFromSections,
  astro101HubTitleFromSections,
  astro101IntroFromSections,
  astro101KindFromSections,
  astro101PageIsServable,
  astro101RelatedFromFacts,
  astro101SlugFromFacts,
  ASTRO_101_KEY_PREFIX,
  isAstro101Kind,
  type Astro101Block,
  type Astro101RelatedLink
} from "../content/astro101";
import { fillAstro101EphemerisSlots } from "../content/astro101Ephemeris";

export type Astro101Page = {
  id: string;
  contentKey: string;
  headline: string;
  summary: string;
  body: string;
  kind: string;
  hubTitle: string;
  intro: string;
  blocks: Astro101Block[];
  slug: string;
  related: Astro101RelatedLink[];
};

type Astro101Row = {
  id: string;
  content_key: string;
  headline: string | null;
  summary: string | null;
  body: string | null;
  sections: unknown;
  facts: unknown;
};

function pageFromRow(row: Astro101Row): Astro101Page | null {
  const filled = fillAstro101EphemerisSlots(row);
  const slug = astro101SlugFromFacts(filled.facts);
  const headline = (filled.headline ?? "").trim();
  if (!astro101PageIsServable(filled)) return null;
  const kindFromKey = filled.content_key.match(/^education\/astro-101\/([^/]+)\//u)?.[1];
  const kind = astro101KindFromSections(filled.sections) || (isAstro101Kind(kindFromKey) ? kindFromKey : "article");
  return {
    id: filled.id,
    contentKey: filled.content_key,
    headline,
    summary: (filled.summary ?? "").trim(),
    body: (filled.body ?? "").trim(),
    kind,
    hubTitle: astro101HubTitleFromSections(filled.sections, kind),
    intro: astro101IntroFromSections(filled.sections),
    blocks: astro101BlocksFromSections(filled.sections),
    slug,
    related: astro101RelatedFromFacts(filled.facts)
  };
}

export async function loadLiveAstro101Pages(): Promise<Astro101Page[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("generated_interpretations")
    .select("id, content_key, headline, summary, body, sections, facts")
    .eq("status", "LIVE")
    .eq("lane", "serving")
    .eq("surface", "education")
    .is("review_state", null)
    .like("content_key", `${ASTRO_101_KEY_PREFIX}%`)
    .returns<Astro101Row[]>();

  if (error) {
    console.warn("Astro 101 pages failed to load.", error);
    return [];
  }

  return (data ?? [])
    .map(pageFromRow)
    .filter((page): page is Astro101Page => page !== null)
    .sort((left, right) => left.contentKey.localeCompare(right.contentKey));
}
