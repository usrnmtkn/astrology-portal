/** Select the author's explicitly labelled TLDR, never an inferred excerpt.
 * Monthly drafts store this section and the forecast in one unchanged body.
 * Keep all TLDR paragraphs and inline formatting; the full body stays in Horoscopes.
 */
export function monthlyHoroscopeTldr(body) {
  if (typeof body !== 'string') return null;
  const label = /^(?:#{1,6}[ \t]+TLDR|\*\*TLDR\*\*|__TLDR__|TLDR):?[ \t]*\r?\n/iu.exec(body);
  if (!label) return null;
  const remainder = body.slice(label[0].length).trimStart();
  // A standalone section heading ends the TLDR. Bold within a paragraph does not.
  const next = /(?:^|\r?\n[ \t]*\r?\n)(?:#{1,6}[ \t]+[^\r\n]+|\*\*[^*\r\n]+\*\*|__[^_\r\n]+__|The month ahead:?)[ \t]*(?:\r?\n|$)/iu.exec(remainder);
  const text = remainder.slice(0, next?.index ?? remainder.length).trim();
  return text || null;
}
