import type { SkyPhrase } from "./SkyPhraseCompositionEditor";

export type SkyParagraph = { id: string; job: string; phrases: SkyPhrase[] };
export type SkyPracticalItem = { id: string; action: string; phrases: SkyPhrase[] };
export type SkyEditorialSection = {
  id: string; label?: string; source?: string; body?: string; phrases?: SkyPhrase[];
  paragraphs?: SkyParagraph[]; items?: SkyPracticalItem[]; role?: string; depth?: string; motion?: string;
};
type Plan = { role: string; label: string; jobs?: string[]; depth?: string };
const main = { role: "main", label: "Main placement", jobs: ["Event, timing, and change", "Planet mechanism", "Sign mechanism", "Lived synthesis", "Tension and perspective"] };
const complication = { role: "complication", label: "Complication", jobs: ["Related event and timing", "What changes", "Collective implications", "Individual implications", "Deeper tension"] };
const history = { role: "history", label: "Previous cycle", jobs: ["Previous period", "Historical examples", "What is different", "Perspective"] };
const practical = { role: "practical", label: "Practical guide" };
const education = { role: "education", label: "What this body represents", jobs: ["Symbolism and background", "Mechanism", "Perspective"] };
const events = { role: "key-event", label: "Key event", jobs: ["Calculated event and timing", "Interpretation", "Response"] };
const phase = { role: "phase", label: "Sign phase", jobs: ["Calculated phase and sign", "Meaning and mechanism", "Examples and tension", "Response"] };

// Structural suggestions only: no dates, astrology prose, automatic activation,
// or inferred applicability. Existing sources are never replaced by a starter.
export const SKY_ARTICLE_OUTLINES: { id: string; label: string; sections: Plan[] }[] = [
  { id: "ingress", label: "Planet ingress", sections: [main, complication, history, practical] },
  { id: "era", label: "Slow planet / era", sections: [{ ...main, label: "Main era", depth: "deep", jobs: ["Timing and residency passes", "Planet mechanism", "Sign mechanism", "Individual implications", "Collective implications", "Tension", "Perspective"] }, history, complication, practical] },
  { id: "body", label: "Unfamiliar body or point", sections: [main, education, { ...practical, label: "How to work with it" }, history] },
  { id: "retrograde", label: "Retrograde in one sign", sections: [{ role: "main", label: "Main retrograde", depth: "deep", jobs: ["Retrograde and timing", "Planet mechanism", "Sign mechanism", "Recognizable experiences", "Underlying issue", "Useful response"] }, events, complication, practical] },
  { id: "phases", label: "Retrograde across signs", sections: [{ role: "orientation", label: "Retrograde overview", jobs: ["Timing and mechanics", "Central meaning", "Perspective"] }, phase, { ...phase, label: "Next sign phase" }, events, practical] },
  { id: "lunation", label: "Lunation / eclipse", sections: [{ role: "orientation", label: "Event orientation", jobs: ["Timing and cycle context", "Relevant mechanisms"] }, { role: "theme", label: "Main theme", jobs: ["Meaning", "Examples", "Response"] }, { role: "theme", label: "Another theme", jobs: ["Meaning", "Tension", "Perspective"] }, history, { role: "response", label: "Response and release", jobs: ["Response"] }, practical] },
  { id: "nodes", label: "Nodal axis", sections: [{ role: "orientation", label: "Axis orientation", jobs: ["Timing and axis shift", "Central tension"] }, { ...education, label: "What the nodes represent" }, { role: "axis", label: "Axis synthesis", jobs: ["What increases", "What decreases", "Integration"] }, { ...events, label: "Eclipse roadmap" }, practical] },
  { id: "return", label: "Personal return", sections: [{ role: "orientation", label: "Audience opening", jobs: ["Who this is for"] }, { ...education, label: "What this return is" }, { role: "return", label: "Return experiences", jobs: ["Meaning", "Examples", "Tension and response"] }, { ...main, label: "Sign-specific return" }, practical] }
];

export function makeSkyArticleOutline(id: string, motion: string): SkyEditorialSection[] {
  const outline = SKY_ARTICLE_OUTLINES.find(item => item.id === id);
  if (!outline) return [];
  return outline.sections.map(plan => ({
    id: `section-${crypto.randomUUID()}`, label: plan.label, role: plan.role, depth: plan.depth ?? "standard", motion,
    ...(plan.role === "practical" ? { items: [{ id: `item-${crypto.randomUUID()}`, action: "", phrases: [] }] }
      : { paragraphs: (plan.jobs ?? []).map(job => ({ id: `paragraph-${crypto.randomUUID()}`, job, phrases: [] })) })
  }));
}
