// These are the three saved sources consumed by renderMoonSignEntry, in reader
// order. The generic sky-placement/article/moon record is not that write-up.
const sections = [
  { slot: "hook", label: "Opening" },
  { slot: "lived", label: "How it shows up" },
  { slot: "turn", label: "Challenge and response" }
] as const;

export function skyMoonWriteupKeys(sign: string) {
  return sections.map(({ slot }) => `fallback-hook/sky-placement-${slot}/moon/${sign}`);
}

export function skyMoonWriteupSection(contentKey: string) {
  const match = /^fallback-hook\/sky-placement-(hook|lived|turn)\/moon\/([^/]+)$/u.exec(contentKey);
  const section = sections.find(({ slot }) => slot === match?.[1]);
  return match && section ? { ...section, sign: match[2] } : null;
}
