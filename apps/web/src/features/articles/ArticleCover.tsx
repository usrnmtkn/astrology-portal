import { ArrowUpRight } from "lucide-react";
import { articleLibraryKind, articleReaderHref } from "../../../../../src/shared/articleLibrary";
import type { GeneratedContentRow } from "../../services/generatedContent";
import { ArticlePublishDate } from "./ArticlePublishDate";

const elements: Record<string, string> = {
  aries: "fire", leo: "fire", sagittarius: "fire", taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air", cancer: "water", scorpio: "water", pisces: "water"
};

/** Cover typography rearranges the complete CMS title; it never creates copy. */
export function ArticleCover({ row, index, featured = false }: { row: GeneratedContentRow; index: number; featured?: boolean }) {
  const title = row.headline!;
  const kind = articleLibraryKind(row) === "guide" ? "Guide" : "Article";
  const sign = title.match(/\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/iu)?.[0].toLowerCase();
  const element = sign ? elements[sign] : undefined;
  const split = title.indexOf(":") >= 0 ? title.indexOf(":") + 1
    : title.includes(" in ") ? title.indexOf(" in ") : title.indexOf(" ", Math.floor(title.length / 3));
  return <a className={`articles-library-card article-cover-card${featured ? " article-cover-card--featured" : ""}`} href={articleReaderHref(row.content_key)} aria-label={title}>
    <div className={`article-cover article-cover--${element ?? "graphite"}`} aria-hidden="true">
      <div className="article-cover__meta"><span>{element ? `${element} / ${kind}` : kind}</span><span>{featured ? "Latest" : String(index + 1).padStart(2, "0")}</span></div>
      <div className="article-cover__title"><span>{split > 0 ? title.slice(0, split) : title}</span>{split > 0 && <em>{title.slice(split)}</em>}</div>
      <span className="article-cover__meta">{kind}</span>
    </div>
    <div className="article-cover__caption"><h2>{title}</h2><span>Read <ArrowUpRight size={16} aria-hidden="true" /></span></div>
    <ArticlePublishDate row={row} />
  </a>;
}
