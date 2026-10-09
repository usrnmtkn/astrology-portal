// Shared composition dependencies stay eligible; canonical placement revisions
// are loaded separately by exact publication ID for the selected signs.
const shared = /^(?:authored\/(?:station|week-opener)\/|fallback-(?:vocab|template)\/|fallback-hook\/(?:sky-|lunation-|transit-|dignity-line|empty-house))/u;
export const skyDashboardScopeFilter = 'and(surface.eq.sky,content_key.not.like.sky-placement/article/%,content_key.not.like.sky-placement/retrograde/%),content_key.like.authored/station/%,content_key.like.authored/week-opener/%,content_key.like.fallback-vocab/%,content_key.like.fallback-template/%,content_key.like.fallback-hook/sky-%,content_key.like.fallback-hook/lunation-%,content_key.like.fallback-hook/transit-%,content_key.like.fallback-hook/dignity-line%,content_key.like.fallback-hook/empty-house%';
export function isSkyDashboardRow(row: { surface: string; content_key: string }) {
  return (row.surface === 'sky' && !/^sky-placement\/(article|retrograde)\//u.test(row.content_key)) || shared.test(row.content_key);
}

// The initial placement list has no aspect articles, personal horoscopes, or
// Calendar paragraphs. Those shared inventories load when opening a detail.
export const skyListDashboardScopeFilter = 'content_key.like.sky-context/%,content_key.like.sky-nodes/%,content_key.like.sky-lilith/%,content_key.like.sky-lunation/%,content_key.like.sky-v4/%,content_key.like.sky-placement/seasonal-context/%,content_key.like.sky-placement/lunar-context/%,content_key.like.fallback-vocab/%,and(content_key.like.fallback-hook/sky-%,content_key.not.like.fallback-hook/sky-aspect-%),content_key.like.fallback-template/sky%';
export function isSkyListDashboardRow(row: { content_key: string }) {
  return /^(?:sky-(?:context|nodes|lilith|lunation|v4)\/|sky-placement\/(?:seasonal-context|lunar-context)\/|fallback-vocab\/|fallback-template\/sky)/u.test(row.content_key)
    || row.content_key.startsWith('fallback-hook/sky-') && !row.content_key.startsWith('fallback-hook/sky-aspect-');
}
