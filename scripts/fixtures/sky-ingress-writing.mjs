/** Structural provider fixture, never reader content or literary evidence. */
export function ingressFixtureValues(prompt, names) {
  const match = prompt.match(/DATED INGRESS COVERAGE AND EVENT MEANING\n\n([^\n]+)/u);
  const plan = match ? JSON.parse(match[1]) : null;
  const values = Object.fromEntries(names.map(name => [name, 'Synthetic complete draft field.']));
  if (plan && names.includes('majorTransitSections')) values.majorTransitSections = plan.developed.map(event =>
    `${event.heading}\n\n${event.positionsLine}\n\nSynthetic interpretation. This is an isolated fixture, not prose quality evidence.`).join('\n\n');
  if (plan && names.includes('otherDatesSection')) values.otherDatesSection = plan.requiredDates.length
    ? `## Other dates\n\n${plan.requiredDates.map(event => event.prefix).join('\n')}` : '';
  return values;
}
