export function placementTemplateKeys(planet: string, sign: string) {
  return [`sky/article-template/${planet}/${sign}`, `sky/article-template/${planet}/ingress`,
    ...(planet.endsWith('-node') ? ['sky/article-template/nodes'] : [])];
}

/** Prefer the exact saved template, then its existing shared ingress template. */
export function skyArticleTemplateKey(planet: string, sign: string, available: readonly string[]) {
  const keys = placementTemplateKeys(planet, sign);
  return keys.flatMap(key => [key, key.replace('sky/article-template/', 'sky-article-template/')])
    .find(key => available.includes(key));
}
