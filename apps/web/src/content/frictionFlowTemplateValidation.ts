export const FRICTION_FLOW_PREFIX = "cms/friction-flow/";

/** The editor receives slots from the source; the API supplies the canonical
 * catalog slots independently. Keeping this validator small avoids loading the
 * complete writing catalog before its Studio workspace opens. */
export function frictionFlowDraftErrors(key: string, body: string, allowedSlots: readonly string[]): string[] {
  if (!key.startsWith(FRICTION_FLOW_PREFIX)) return [];
  const errors: string[] = [];
  const slots = [...body.matchAll(/\{(\w+)\}/gu)].map(match => match[1]);
  if (/[{}]/u.test(body.replace(/\{\w+\}/gu, ""))) errors.push("Use matching single-brace variables from this source.");
  if (slots.some(slot => !allowedSlots.includes(slot))) errors.push("This source contains an unsupported variable.");
  for (const slot of allowedSlots) if (slots.filter(value => value === slot).length !== 1) errors.push(`Keep exactly one {${slot}} calculated variable.`);
  if (!body.trim()) errors.push("Keep wording in this source.");
  if (/[<>]/u.test(body)) errors.push("Use plain writing without HTML.");
  return errors;
}
