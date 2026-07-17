export type DashboardPageKey =
  | "overview"
  | "articles"
  | "content"
  | "reviewQueue"
  | "compositeByType"
  | "connection"
  | "appBehavior"
  | "vocabulary"
  | "slotDictionary"
  | "knowledge"
  | "templates"
  | "hooks"
  | "releaseNotes";

export type ContentSystemWorkstreamState =
  | "WORKING"
  | "PARTIAL"
  | "MISSING"
  | "BLOCKED_BY_CONTENT"
  | "BLOCKED_BY_BIRTH_TIME"
  | "EDITORIAL_REVIEW_REQUIRED";

export type ContentSystemWorkstream = {
  id: string;
  title: string;
  state: ContentSystemWorkstreamState;
  scope: string;
  nextAction: string;
};

export const contentSystemWorkstreams: ContentSystemWorkstream[] = [
  {
    id: "dashboard-authoring-map",
    title: "Dashboard authoring map",
    state: "WORKING",
    scope: "Write, Composition, App Surfaces, Publish, and System are the primary admin paths.",
    nextAction:
      "Keep the full content library, articles, vocabulary, templates, fallback hooks, and diagnostics in separate editors.",
  },
  {
    id: "surface-editors",
    title: "Surface-filtered editors",
    state: "PARTIAL",
    scope:
      "Sky, Natal, Transits, Friends, Synastry, Soul's Purpose, Career, templates, slots, and phrase banks.",
    nextAction:
      "Expose the exact rows, slots, templates, fallback hooks, and vocabulary each surface can call.",
  },
  {
    id: "reader-safety",
    title: "Reader safety contract",
    state: "PARTIAL",
    scope: "Published status, reader-safe fields, fallback resolution, and legacy quarantine.",
    nextAction:
      "Block legacy, unsafe, reference, directional, and editorial-only rows from every reader surface.",
  },
  {
    id: "soul-career",
    title: "Soul and Career renderers",
    state: "PARTIAL",
    scope: "Mission statement and career pattern cards.",
    nextAction:
      "Use narrative templates only; never render authoring directions or source-framework notes.",
  },
  {
    id: "creation-flows",
    title: "Creation flows",
    state: "PARTIAL",
    scope: "New article, new content row, new reusable phrase or clause, and import.",
    nextAction:
      "Make creation entry points visible from the main dashboard and route each draft to the correct editor.",
  },
];

export type DashboardSurfaceNavigationGroup = {
  label: string;
  description: string;
  items: Array<{
    label: string;
    page: DashboardPageKey;
  }>;
};

export const dashboardSurfaceNavigation: DashboardSurfaceNavigationGroup[] = [
  {
    label: "Write",
    description: "Create or edit reader-facing material.",
    items: [
      { label: "New article", page: "articles" },
      { label: "Content library", page: "content" },
      { label: "Reusable phrase or clause", page: "vocabulary" },
      { label: "Import", page: "content" },
    ],
  },
  {
    label: "Composition",
    description: "Edit the language system that fills fallback templates.",
    items: [
      { label: "Templates", page: "templates" },
      { label: "Slots", page: "slotDictionary" },
      { label: "Vocabulary and phrase banks", page: "vocabulary" },
      { label: "Fallback hooks", page: "knowledge" },
    ],
  },
  {
    label: "App Surfaces",
    description: "Audit the public surfaces and their content paths.",
    items: [
      { label: "Surface map", page: "hooks" },
      { label: "Sky", page: "content" },
      { label: "Natal", page: "content" },
      { label: "Transits", page: "content" },
      { label: "Friends", page: "content" },
      { label: "Synastry", page: "content" },
      { label: "Composite", page: "compositeByType" },
      { label: "Soul's Purpose", page: "content" },
      { label: "Career", page: "content" },
    ],
  },
  {
    label: "Publish",
    description: "Review, publish, schedule, and archive rows.",
    items: [
      { label: "Review queue", page: "reviewQueue" },
      { label: "Scheduled", page: "content" },
      { label: "Published", page: "content" },
      { label: "Archive", page: "content" },
    ],
  },
  {
    label: "System",
    description: "Connection, behavior flags, diagnostics, and release history.",
    items: [
      { label: "API / connection status", page: "connection" },
      { label: "App behavior", page: "appBehavior" },
      { label: "Release notes", page: "releaseNotes" },
    ],
  },
];
