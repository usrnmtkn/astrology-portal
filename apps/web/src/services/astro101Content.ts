import { getSupabaseClient } from "./auth";
import {
  astro101BlocksFromSections,
  astro101IntroFromSections,
  astro101KindFromSections,
  astro101RelatedFromFacts,
  astro101SlugFromFacts,
  ASTRO_101_KEY_PREFIX,
  type Astro101Block,
  type Astro101RelatedLink
} from "../content/astro101";

export type Astro101Page = {
  id: string;
  contentKey: string;
  headline: string;
  summary: string;
  body: string;
  kind: string;
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
  const slug = astro101SlugFromFacts(row.facts);
  const headline = (row.headline ?? "").trim();
  const body = (row.body ?? "").trim();
  if (!slug || !headline || !body) return null;
  return {
    id: row.id,
    contentKey: row.content_key,
    headline,
    summary: (row.summary ?? "").trim(),
    body,
    kind: astro101KindFromSections(row.sections),
    intro: astro101IntroFromSections(row.sections),
    blocks: astro101BlocksFromSections(row.sections),
    slug,
    related: astro101RelatedFromFacts(row.facts)
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
