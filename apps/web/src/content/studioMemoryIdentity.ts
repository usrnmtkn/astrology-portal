/** Memory identity is separate from the short-card generation identity. */
export function studioArticleMemoryKey(key: string): string | null {
  if (/^sky-article(?:-revision)?\/[a-z_]+\/[a-z]+\/\d{4}$/.test(key))
    return key.replace(/^sky-article-revision\//, 'sky-article/');
  if (/^fallback-hook\/sky-sign-copy\/[a-z_]+\/[a-z]+$/.test(key)) return key;
  return null;
}

/** Exact Personal Transit / House Transit write-ups share one Memory Map family. */
export function studioPersonalTransitMemoryKey(key: string): string | null {
  if (/^authored\/transit-aspect\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z]+$/.test(key)) return key;
  if (/^authored\/transit-return\/[a-z0-9-]+$/.test(key)) return key;
  if (/^authored\/transit-house(?:-intro|-sign)?\/[a-z0-9-]+\/\d{1,2}(?:\/[a-z]+)?$/.test(key)) return key;
  return null;
}

export function studioWritingMemoryKey(key: string): string | null {
  return studioArticleMemoryKey(key) ?? studioPersonalTransitMemoryKey(key);
}
