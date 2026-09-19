export const natalAspectContentKeyPrefix = "fallback-hook/natal-aspect-lived/";
export const natalAspectTheyNameVariable = "{{Name}}";

export type NatalAspectSelection = {
  first: string;
  aspect: string;
  second: string;
};

export type NatalAspectSourceRow = {
  content_key: string;
};

export type NatalAspectSourceDraft = {
  id: null;
  contentKey: string;
  surface: "you";
  mode: "in_depth";
  status: "DRAFT";
  headline: string;
  summary: string;
  body: string;
  lane: "reference";
  reviewState: "needs-review";
  blockType: "fallback_hook";
  promptVersion: "manual-admin";
  sections: {
    packageRecord: {
      contentKey: string;
      content_role: "full_copy";
      grammar_frame: "complete_sentence";
      body: string;
      body_you: string;
      body_they: string;
      reader_only: true;
      render_policy: "reader-only-exact-lived-v1";
      review_status: "needs_review";
    };
  };
  facts: {
    fallbackArchitectureV3: true;
    first: string;
    aspect: string;
    second: string;
  };
  reviewerNotes: string;
  sourceSnapshot: {
    contentType: "natal-aspect-exact";
    contentSystem: "fallback";
    content_role: "full_copy";
    review_status: "needs_review";
    sourcePackage: "tldrastro-fallback-architecture-v3";
  };
};

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseNatalAspectContentKey(contentKey: string): NatalAspectSelection | null {
  if (!contentKey.startsWith(natalAspectContentKeyPrefix)) return null;
  const parts = contentKey.slice(natalAspectContentKeyPrefix.length).split("/");
  if (parts.length !== 3 || parts.some((part) => !part.trim())) return null;
  const [first, aspect, second] = parts;
  return { first, aspect, second };
}

export function natalAspectDisplayTitle(selection: NatalAspectSelection) {
  return `${titleCase(selection.first)} ${titleCase(selection.aspect)} ${titleCase(selection.second)}`;
}

export function natalAspectContentKey(selection: NatalAspectSelection) {
  return `${natalAspectContentKeyPrefix}${selection.first}/${selection.aspect}/${selection.second}`;
}

const natalAspectComposedGroups: Record<string, string> = {
  conjunction: "conjunction",
  square: "hard",
  opposition: "hard",
  trine: "soft",
  sextile: "soft"
};

function natalAspectKeyPart(value: string) {
  return value.trim().toLowerCase().replace(/_/g, "-");
}

function generatedNatalAspectContentKey(first: string, aspect: string, second: string) {
  const natalAspectBodyOrder = [
    "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
    "chiron", "north_node", "south_node", "ascendant", "descendant", "midheaven", "imum_coeli"
  ];
  const part = (value: string) => {
    const slug = natalAspectKeyPart(value);
    if (slug === "true-node" || slug === "north-node") return "north_node";
    if (slug === "south-node") return "south_node";
    return slug.replace(/-/g, "_");
  };
  const firstPart = part(first);
  const secondPart = part(second);
  const firstIndex = natalAspectBodyOrder.indexOf(firstPart);
  const secondIndex = natalAspectBodyOrder.indexOf(secondPart);
  const [left, right] = firstIndex >= 0 && secondIndex >= 0
    ? (firstIndex <= secondIndex ? [firstPart, secondPart] : [secondPart, firstPart])
    : (firstPart.localeCompare(secondPart) <= 0 ? [firstPart, secondPart] : [secondPart, firstPart]);
  return `natal.aspect.${left}.${part(aspect)}.${right}`;
}

export function natalAspectReaderCandidateKeys(selection: NatalAspectSelection) {
  const first = natalAspectKeyPart(selection.first);
  const second = natalAspectKeyPart(selection.second);
  const aspect = natalAspectKeyPart(selection.aspect);
  return [...new Set([
    natalAspectContentKey({ first, aspect, second }),
    natalAspectContentKey({ first: second, aspect, second: first }),
    generatedNatalAspectContentKey(first, aspect, second),
    `natal-${first}-${aspect}-${second}`,
    `natal-${second}-${aspect}-${first}`
  ])];
}

export type NatalAspectComposedSource = {
  id: string;
  label: string;
  scope: string;
  candidateKeys: string[];
};

export function natalAspectComposedSources(selection: NatalAspectSelection): NatalAspectComposedSource[] {
  const first = natalAspectKeyPart(selection.first);
  const second = natalAspectKeyPart(selection.second);
  const aspect = natalAspectKeyPart(selection.aspect);
  const group = natalAspectComposedGroups[aspect];
  const title = natalAspectDisplayTitle({ first, aspect, second });
  const sources: NatalAspectComposedSource[] = [];
  if (group) {
    const pairKeys = [...new Set([
      `fallback-hook/aspect-pair/${first}/${second}/${group}`,
      `fallback-hook/aspect-pair/${second}/${first}/${group}`
    ])];
    sources.push({
      id: "pair-writing",
      label: `${title} pair writing`,
      scope: "The You page currently uses this pair writing when no exact natal-aspect-lived passage is saved.",
      candidateKeys: pairKeys
    });
  }
  sources.push({
    id: "natal-aspect-template",
    label: "Natal aspect template",
    scope: "Shared assembled shape for natal aspects that do not have an exact pair-specific passage.",
    candidateKeys: ["fallback-template/natal.aspect"]
  });
  return sources;
}

export function natalAspectResolverDependencyKeys(selection: NatalAspectSelection) {
  return [...new Set([
    ...natalAspectReaderCandidateKeys(selection),
    ...natalAspectComposedSources(selection).flatMap((source) => source.candidateKeys)
  ])];
}

export { studioServingStatusRow as natalAspectComposedStatusRow } from "./studioServingStatus.ts";

export function natalAspectSourceDraft(selection: NatalAspectSelection): NatalAspectSourceDraft {
  const contentKey = natalAspectContentKey(selection);
  return {
    id: null,
    contentKey,
    surface: "you",
    mode: "in_depth",
    status: "DRAFT",
    headline: natalAspectDisplayTitle(selection),
    summary: "Exact natal aspect writing for the reader's birth chart.",
    body: "",
    lane: "reference",
    reviewState: "needs-review",
    blockType: "fallback_hook",
    promptVersion: "manual-admin",
    sections: {
      packageRecord: {
        contentKey,
        content_role: "full_copy",
        grammar_frame: "complete_sentence",
        body: "",
        body_you: "",
        body_they: "",
        reader_only: true,
        render_policy: "reader-only-exact-lived-v1",
        review_status: "needs_review"
      }
    },
    facts: {
      fallbackArchitectureV3: true,
      first: selection.first,
      aspect: selection.aspect,
      second: selection.second
    },
    reviewerNotes: "Created from the Natal Aspects empty state. Write and review both reader perspectives before publishing.",
    sourceSnapshot: {
      contentType: "natal-aspect-exact",
      contentSystem: "fallback",
      content_role: "full_copy",
      review_status: "needs_review",
      sourcePackage: "tldrastro-fallback-architecture-v3"
    }
  };
}

export function natalAspectSelectionOptions(rows: NatalAspectSourceRow[]) {
  const parsed = rows
    .map((row) => parseNatalAspectContentKey(row.content_key))
    .filter((selection): selection is NatalAspectSelection => Boolean(selection));
  const bodies = [...new Set(parsed.flatMap((selection) => [selection.first, selection.second]))].sort();
  return {
    first: bodies,
    aspects: [...new Set(parsed.map((selection) => selection.aspect))].sort(),
    second: bodies
  };
}

export function natalAspectMatchesSelection(
  row: NatalAspectSourceRow,
  selection: Partial<NatalAspectSelection>
) {
  const parsed = parseNatalAspectContentKey(row.content_key);
  if (!parsed) return false;
  if (selection.aspect && parsed.aspect !== selection.aspect) return false;
  if (selection.first && selection.second) {
    return (parsed.first === selection.first && parsed.second === selection.second)
      || (parsed.first === selection.second && parsed.second === selection.first);
  }
  const selectedBody = selection.first || selection.second;
  return !selectedBody || parsed.first === selectedBody || parsed.second === selectedBody;
}
