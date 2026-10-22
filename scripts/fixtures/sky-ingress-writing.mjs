/** Structural provider fixture, never reader content or literary evidence. */
export function ingressFixtureValues(prompt, names) {
  const match = prompt.match(/DATED INGRESS COVERAGE AND EVENT MEANING\n\n([^\n]+)/u);
  const plan = match ? JSON.parse(match[1]) : null;
  const values = Object.fromEntries(names.map(name => [name, 'Synthetic complete draft field.']));
  return values;
}
