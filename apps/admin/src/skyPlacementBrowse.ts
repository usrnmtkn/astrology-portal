import type { SkyWriteupRelationRow } from "./skyWriteupRelations";
import { seasonArticleIdentity } from "../../../src/shared/seasonArticle";

/** Identify the saved object, rather than giving every object the placement's name. */
export function skyPlacementBrowseIdentity(row: SkyWriteupRelationRow & { event_type?: string | null }, placement: string) {
  const key = row.content_key;
  const season = seasonArticleIdentity(key);
  if (season) return { title: row.headline?.trim() || placement, kind: `Season article · ${season.year}` };
  const date = key.match(/\/(\d{4}-\d{2}-\d{2})$/u)?.[1];
  const dated = (kind: string) => `${kind}${date ? ` · ${date}` : ""}`;
  if (key.startsWith("sky-article-workspace/")) return { title: placement, kind: dated("Writing workspace") };
  if (key.startsWith("sky/article-template/")) return { title: placement, kind: "Reusable article template" };
  if (key.startsWith("sky-article-revision/") || row.event_type === "sky-article-edition-revision") {
    return { title: row.headline?.trim() || placement, kind: dated("Article revision") };
  }
  if (key.startsWith("sky-article/") || key.startsWith("sky/article-edition/")) {
    return { title: row.headline?.trim() || placement, kind: dated("Dated article") };
  }
  if (key.startsWith("sky-season-fallback/")) return { title: row.headline?.trim() || placement, kind: dated("Seasonal placement reading") };
  return null;
}
