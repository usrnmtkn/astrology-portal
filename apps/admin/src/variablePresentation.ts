/** Display aliases only. Saved tokens and their reader contracts never change. */
const labels: Record<string, string> = {
  planetTitle: 'Planet name', signTitle: 'Zodiac sign', placementDignity: 'Sign dignity',
  sunSummary: 'Sun summary', moonWriteup: 'Moon passage', overview: 'Monthly overview',
};
export function variableLabel(name: string) {
  return labels[name] ?? name.replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .replace(/[._-]+/gu, ' ').replace(/^./u, letter => letter.toUpperCase());
}
const passageMoonLabels: Record<string, string> = {
  moonSign: 'Moon sign at start of day', nextMoonSign: 'Moon sign after next change',
  nextMoonSignEntryTime: 'Next Moon sign change time',
};
export const calendarPassageVariableLabel = (name: string) => passageMoonLabels[name] ?? variableLabel(name);
export function calendarPassageVariableHelp(name: string) {
  return ({
    moonSign: 'The sign the local day starts in. On a change day this stays the departing sign; the reader’s noon sign may differ.',
    nextMoonSign: 'The sign entered at the next change after the day starts. That change may be on a later date.',
    nextMoonSignEntryTime: 'Local time of the next sign change after the day starts. Check Moon timing for the date and time zone.',
  } as Record<string, string>)[name];
}
export function variableMatches(query: string, ...fields: string[]) {
  const text = fields.join(' ').toLocaleLowerCase();
  return query.toLocaleLowerCase().replace(/[{}]/gu, '').trim().split(/\s+/u)
    .filter(Boolean).every(term => text.includes(term));
}
export const isConditionVariable = (name: string) => /^(?:has|is)[A-Z]/u.test(name);

export function calendarVariableKind(name: string, value?: { kind: string }) {
  return isConditionVariable(name) ? 'Condition'
    : value?.kind === 'copy' || /^(?:sunSummary|moonWriteup|overview|\w+Writeup)$/u.test(name) ? 'Saved writing'
      : value?.kind === 'example' ? 'Example value' : 'Calculated value';
}
