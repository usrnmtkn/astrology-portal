/** Lossless separation of known imported Sky article horoscope sections. */
export const ARTICLE_HOROSCOPE_SCHEMA = 'sky-article-horoscopes-v1';
const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const articleKey = /^sky\/article-(?:template|edition)\/[a-z-]+(?:\/[a-z-]+)?$/u;
const sectionHeading = /^## [^\n]*\bHoroscopes\b[^\n]*$/gimu;

export function articleHoroscopeSection(sections) {
  const value = sections?.articleHoroscopes;
  if (value === undefined) return null;
  if (!value || value.schema !== ARTICLE_HOROSCOPE_SCHEMA || typeof value.heading !== 'string'
    || typeof value.introduction !== 'string' || !Array.isArray(value.passages)
    || ![0,12].includes(value.passages.length)) throw new Error('Invalid article horoscope sections. Reload the saved article.');
  const seen = new Set();
  const houses = new Set();
  if (!/^## [^\n]*\bHoroscopes\b[^\n]*$/iu.test(value.heading)) throw new Error('Keep the horoscope section heading on one line starting with ##.');
  for (const passage of value.passages) {
    if (!signs.includes(passage.risingSign) || seen.has(passage.risingSign)
      || houses.has(passage.house) || !Number.isInteger(passage.house) || passage.house < 1 || passage.house > 12
      || typeof passage.heading !== 'string' || typeof passage.body !== 'string' || !passage.body.trim()) {
      throw new Error('Article horoscopes require twelve distinct rising signs and complete passages.');
    }
    seen.add(passage.risingSign);
    houses.add(passage.house);
  }
  if (!value.passages.length && !value.introduction.includes('{{risingBlocks}}')) {
    throw new Error('A generic horoscope section must retain its risingBlocks variable.');
  }
  return value;
}

export function extractArticleHoroscopes(body, contentKey) {
  if (!articleKey.test(contentKey) || typeof body !== 'string') return null;
  const headings = [...body.matchAll(sectionHeading)];
  if (!headings.length) {
    if (/^###\s+[A-Za-z]+\s*&\s*[A-Za-z]+ Rising\s*$/mu.test(body)) throw new Error('Rising-sign passages need a Horoscope section heading before import.');
    return null;
  }
  if (headings.length !== 1) throw new Error('Multiple horoscope sections require manual separation; no writing was removed.');
  const heading = headings[0];
  const tail = body.slice(heading.index + heading[0].length);
  if (/^#{1,2}\s/mu.test(tail)) throw new Error('Article sections follow the horoscopes; separate them before import.');
  const rising = [...tail.matchAll(/^### ([A-Za-z]+) & ([A-Za-z]+) Rising[ \t]*$/gmu)];
  const sign = contentKey.split('/').at(-1);
  const signIndex = signs.indexOf(sign);
  let introduction = tail.trim();
  let passages = [];
  if (rising.length) {
    if (rising.length !== 12 || signIndex < 0) throw new Error('Expected twelve horoscope passages and an exact article sign; no writing was removed.');
    introduction = tail.slice(0,rising[0].index).trim();
    passages = rising.map((match,index) => {
      const risingSign = match[1].toLowerCase();
      if (risingSign !== match[2].toLowerCase()) throw new Error('Horoscope heading contains conflicting rising signs.');
      const text = tail.slice(match.index + match[0].length, rising[index+1]?.index ?? tail.length).trim();
      if (/^###\s/mu.test(text)) throw new Error('Unrecognized heading inside a horoscope; no writing was removed.');
      return {risingSign, house:((signIndex-signs.indexOf(risingSign)+12)%12)+1, heading:match[0], body:text};
    });
  }
  const result = {schema:ARTICLE_HOROSCOPE_SCHEMA, heading:heading[0], introduction, passages};
  articleHoroscopeSection({articleHoroscopes:result});
  return {body:body.slice(0,heading.index).trimEnd(), articleHoroscopes:result, originalHoroscopeBlock:body.slice(heading.index)};
}

export function articleTemplateWithHoroscopes(body, sections) {
  const section = articleHoroscopeSection(sections);
  if (!section) return body;
  return [body, section.heading, section.introduction,
    ...section.passages.map(passage => `${passage.heading}\n\n${passage.body}`)].filter(Boolean).join('\n\n');
}

/** Storage shape: preserve status, publication, provenance and unrelated sections. */
export function separateArticleHoroscopeRow(row) {
  if (!articleKey.test(row.content_key ?? '')) return row;
  const current = articleHoroscopeSection(row.sections);
  const extracted = extractArticleHoroscopes(row.body, row.content_key);
  if (!extracted) return row;
  if (current && JSON.stringify(current) !== JSON.stringify(extracted.articleHoroscopes)) {
    throw new Error('The article body and horoscope fields contain different versions. Keep the intended horoscope version in its fields before saving.');
  }
  if (Array.isArray(row.sections) && row.sections.length) throw new Error('Existing article sections need manual review before horoscope separation.');
  const snapshot = row.source_snapshot ?? {};
  return {...row, body:extracted.body, sections:{...(row.sections ?? {}),articleHoroscopes:extracted.articleHoroscopes},
    source_snapshot:{...snapshot, horoscopeSeparation:snapshot.horoscopeSeparation ?? {
      schema:ARTICLE_HOROSCOPE_SCHEMA, originalBody:row.body, originalSections:row.sections ?? {},
      originalUpdatedAt:row.updated_at ?? null, originalStatus:row.status ?? null,
      originalHoroscopeBlock:extracted.originalHoroscopeBlock
    }}};
}
