const sectionLabels: Record<string, string> = {
  feel: "What this can feel like",
  shows_up: "Where it tends to show up",
  complicated: "When it gets complicated",
  another_response: "Another response",
  level_2: "How the pattern works",
  how_it_works: "How it works",
  planet_roles: "Planet roles",
  pressure_or_support: "Pressure and support",
  derived_point: "Reference point",
  reference_point: "Reference point",
  watch_for: "Watch for",
  confidence_note: "Reading note"
};

export function resolvedNatalAspectPatternSectionLabel(section: { id: string; title?: string }): string | null {
  return section.title ?? sectionLabels[section.id] ?? null;
}
