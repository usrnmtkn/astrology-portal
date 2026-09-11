/** Memory identity is separate from the short-card generation identity. */
export function studioArticleMemoryKey(key: string): string | null {
  if (/^sky-article(?:-revision)?\/[a-z_]+\/[a-z]+\/\d{4}$/.test(key))
    return key.replace(/^sky-article-revision\//, 'sky-article/');
  if (/^fallback-hook\/sky-sign-copy\/[a-z_]+\/[a-z]+$/.test(key)) return key;
  return null;
}
