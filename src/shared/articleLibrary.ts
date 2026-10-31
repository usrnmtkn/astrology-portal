/** Shared identities only; this module does not confer publication approval. */
export type ArticleLibraryKind = "article" | "guide" | "sky";
export const articleLibraryPrefixes = ["article/manual/", "article/guide/", "sky-article/"] as const;
export function standaloneArticleKind(key: string): "article" | "guide" | null {
  if (/^article\/manual\/[^/]+$/u.test(key)) return "article";
  if (/^article\/guide\/[^/]+$/u.test(key)) return "guide";
  return null;
}
export function articleLibraryKind(row: { content_key: string; event_type?: string | null }): ArticleLibraryKind | null {
  return standaloneArticleKind(row.content_key)
    ?? (row.event_type === "sky-article-edition" || /^(?:sky\/article-template\/|sky-article-template\/|sky-article\/)/u.test(row.content_key) ? "sky" : null);
}
export function articleReaderHref(contentKey: string) {
  return `/#articles/${encodeURIComponent(contentKey)}`;
}
export function articleKeyFromHash(hash: string) {
  const value = hash.replace(/^#\/?/u, "");
  if (!value.startsWith("articles/")) return null;
  try { return decodeURIComponent(value.slice("articles/".length)); } catch { return null; }
}

type PublicationRow = { content_key: string; sections?: unknown; published_at?: string | null; target_date?: string | null; updated_at?: string | null };
export function validArticleTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}
export function articlePublicationTimeZone(row: PublicationRow) {
  const zone = (row.sections as { articlePublication?: { timeZone?: unknown } } | null)?.articlePublication?.timeZone;
  return validArticleTimeZone(zone) ? zone : undefined;
}
export function validArticlePublishAt(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export function articlePublishAt(row: PublicationRow): string | null {
  if (!standaloneArticleKind(row.content_key)) return null;
  const value = (row.sections as { articlePublication?: { publishAt?: unknown } } | null)?.articlePublication?.publishAt;
  return validArticlePublishAt(value) ? value : null;
}
export function articlePublicationIsDue(row: PublicationRow, now = Date.now()) {
  if (!standaloneArticleKind(row.content_key)) return true;
  const publication = (row.sections as { articlePublication?: unknown } | null)?.articlePublication;
  if (publication == null) return true;
  const at = articlePublishAt(row);
  return at !== null && Date.parse(at) <= now;
}
export function articlePublicationDate(row: PublicationRow) {
  return articlePublishAt(row) ?? (standaloneArticleKind(row.content_key) ? row.published_at : null) ?? null;
}
export function articleSortDate(row: PublicationRow) {
  return Date.parse(articlePublicationDate(row) ?? row.target_date ?? row.updated_at ?? "") || 0;
}
