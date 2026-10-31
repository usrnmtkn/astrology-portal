import { articlePublicationDate, articlePublicationTimeZone } from "../../../../../src/shared/articleLibrary";
import type { GeneratedContentRow } from "../../services/generatedContent";

export function ArticlePublishDate({ row }: { row: GeneratedContentRow }) {
  const at = articlePublicationDate(row);
  if (!at || !Number.isFinite(Date.parse(at))) return null;
  return <time className="article-publish-date" dateTime={at}>Published {new Date(at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", timeZone: articlePublicationTimeZone(row) })}</time>;
}
