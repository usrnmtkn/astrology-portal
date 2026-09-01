export type ArticleWorkspaceRow = {
  block_type?: string | null;
  content_key: string;
  facts?: unknown;
  mode?: string | null;
  source_snapshot?: unknown;
  status?: string | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isSkyWriteupContentRow(row: ArticleWorkspaceRow) {
  const key = row.content_key.toLowerCase();
  return row.block_type === "sky_placement"
    || row.block_type === "sky_article"
    || /^sky\.placement\./u.test(key)
    || /^sky[/-](?:placement|article)[/-]/u.test(key)
    || /^sky-article\//u.test(key)
    || /^authored\/sky-lunation-macro\//u.test(key)
    || /^authored\/sky-(?:newmoon|fullmoon)\//u.test(key)
    || /^authored\/sky-eclipse\//u.test(key);
}

export type ArticleAppDestination = {
  detail: string;
  label: string;
  state: "connected" | "draft" | "unconnected";
};

export function articleAppDestination(row: ArticleWorkspaceRow): ArticleAppDestination {
  const source = record(row.source_snapshot);
  const facts = record(row.facts);
  const explicitDestination = text(
    source.appDestination
    ?? source.app_destination
    ?? facts.appDestination
    ?? facts.app_destination
  );

  if (row.status !== "LIVE") {
    return {
      detail: "This article is still an editorial draft and cannot appear for readers.",
      label: "Draft—not published",
      state: "draft"
    };
  }

  if (explicitDestination) {
    return {
      detail: `The article declares ${explicitDestination} as its reader destination.`,
      label: explicitDestination,
      state: "connected"
    };
  }

  return {
    detail: "Publishing alone does not place an article in the app. A reader page must request this content key.",
    label: "Not connected to app",
    state: "unconnected"
  };
}
