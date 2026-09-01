export const natalAspectContentKeyPrefix = "fallback-hook/natal-aspect-lived/";

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
