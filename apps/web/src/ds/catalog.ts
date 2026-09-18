/** DesignMD-shaped catalogs mapped onto live reader surfaces. Do not import foreign brand blocks. */

export const livePatterns = [
  { id: "tabs", use: "SegmentedControl", avoid: "Selected-button fills or extra heading rows for the tab strip." },
  { id: "top-navigation", use: "Existing app nav in app-shell.css", avoid: "A second visible site title." },
  { id: "list-view", use: "placementRow / skyPlacement / aspectCard recipes", avoid: "Card-in-card nesting." },
  { id: "calendar-view", use: "LunarCalendar and Calendar route", avoid: "Invented date tables; use calculated event dates." },
  { id: "filter-panel", use: "Existing Sky/Calendar filter controls", avoid: "Raw colors or a new type scale." },
  { id: "empty-state", use: "EmptyState pattern / you-empty-card", avoid: "Coaching copy or invented astrology." },
  { id: "loading-skeleton", use: "PageLoading", avoid: "A second loading illustration system." },
  { id: "article-layout", use: "ArticlePage template", avoid: "Summarizing owner-authored passages to fit a card." },
  { id: "modal-dialog", use: "Existing modal styles", avoid: "New overlay tokens." },
  { id: "hero-section", use: null, avoid: "Marketing heroes. Reader pages open on current sky, calendar, or chart content." },
  { id: "pricing-table", use: null, avoid: "Install DesignMD pricing blocks. Keep the product content system." }
] as const;

export const liveBlocks = [
  { id: "sky-placement-card", recipe: "skyPlacement", surfaces: ["Sky"] },
  { id: "calendar-aspect-card", recipe: "aspectCard", surfaces: ["Calendar"] },
  { id: "personal-transit-card", recipe: "transitCard", surfaces: ["You", "Friends"] },
  { id: "natal-placement-row", recipe: "placementRow", surfaces: ["You", "Friends"] },
  { id: "natal-pattern-card", recipe: "natalPatternCard", surfaces: ["You"] },
  { id: "article-body", recipe: "articlePage", surfaces: ["Sky", "You", "Learn"] }
] as const;

export function planLiveBuild(brief: string) {
  const text = brief.toLowerCase();
  const blocks = liveBlocks.filter((block) => block.surfaces.some((surface) => text.includes(surface.toLowerCase()))
    || text.includes(block.id.replaceAll("-", " ")));
  const patterns = livePatterns.filter((pattern) => pattern.use && text.includes(pattern.id.replaceAll("-", " ")));
  return {
    tokens: "apps/web/DESIGN.md",
    patterns: patterns.length ? patterns : livePatterns.filter((pattern) => pattern.use),
    blocks: blocks.length ? blocks : liveBlocks,
    skip: livePatterns.filter((pattern) => !pattern.use)
  };
}
