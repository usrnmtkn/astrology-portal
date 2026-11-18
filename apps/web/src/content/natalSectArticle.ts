export type NatalSect = "day" | "night";
export function natalSectRoles(sect: NatalSect) {
  return (sect === "day" ? ["Sun", "Jupiter", "Saturn", "Mars"] : ["Moon", "Venus", "Mars", "Saturn"])
    .map((planet, index) => ({ planet, role: ["Sect light", "Benefic of sect", "Malefic of sect", "Contrary malefic"][index], tone: index < 2 ? "support" : index === 3 ? "caution" : "neutral" }));
}

/** Presentation-only segmentation: every saved sentence stays in source order. */
export function natalSectArticleParts(body: string, sect: NatalSect, taggedSections?: unknown): {
  lead: string; sections: Array<{ body: string; fact?: ReturnType<typeof natalSectRoles>[number]; heading?: string }>;
} {
  const roles = natalSectRoles(sect);
  if (Array.isArray(taggedSections) && taggedSections.length && taggedSections.every(section => section && typeof section.body === "string")) {
    return { lead: body, sections: taggedSections.map(section => ({ body: section.body as string, heading: typeof section.heading === "string" ? section.heading : undefined,
      fact: roles.find(role => [section.planet, section.id, section.heading].some(value => typeof value === "string" && value.toLowerCase() === role.planet.toLowerCase())) })) };
  }
  const paragraphs = body.split(/\n{2,}/u).map(text => text.trim()).filter(Boolean);
  const first = paragraphs.shift() ?? "";
  const opening = first.match(/^([\s\S]*?[.!?]\s+[\s\S]*?[.!?])\s+([\s\S]+)$/u);
  const hasSectOpening = first.includes(roles[0].planet) && first.includes(roles[1].planet);
  const lead = hasSectOpening && opening ? opening[1] : first;
  if (hasSectOpening && opening) paragraphs.unshift(opening[2]);
  return { lead, sections: paragraphs.map(body => {
    const facts = roles.slice(1).filter(role => new RegExp(`\\b${role.planet}\\b`, "u").test(body.split(/(?<=[.!?])\s/u)[0]));
    return { body, fact: facts.length === 1 ? facts[0] : undefined };
  }) };
}
