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
