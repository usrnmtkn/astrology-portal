const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const { createHash } = require('node:crypto');

const ids = new Set(['general-2026', 'work-money-2026', 'love-connection-2026', 'personal-health-2026', 'social-writing-references-20260921'].map(id => `private:report/${id}`));

/** Original owner evidence lives in protected storage, never in Git or web assets. */
function readDocument(id, optional = false) {
  if (!ids.has(id)) throw new Error('Unknown private report document.');
  const encoded = process.env.PRIVATE_REPORT_DOCUMENTS;
  let raw;
  if (encoded) raw = gunzipSync(Buffer.from(encoded, 'base64'), { maxOutputLength: 1024 * 1024 }).toString('utf8');
  else if (!process.env.VERCEL && !process.env.CI) {
    const file = path.join(process.cwd(), '.private-documents/reports.json');
    if (fs.existsSync(file)) raw = fs.readFileSync(file, 'utf8');
  }
  if (!raw) {
    if (optional) return null;
    throw new Error('Private report evidence is unavailable. Configure protected document storage.');
  }
  let corpus;
  try { corpus = JSON.parse(raw); }
  catch { throw new Error('Private report evidence failed integrity verification.'); }
  if (!corpus || corpus.schema !== 'private-reports/v1' || !corpus.documents
    || typeof corpus.documents !== 'object' || Array.isArray(corpus.documents)) {
    throw new Error('Private report evidence failed integrity verification.');
  }
  const record = corpus.documents[id];
  // An absent supplemental collection may be provisioned later. A malformed
  // store or corrupt supplied collection must never silently become a fallback.
  if (optional && !Object.hasOwn(corpus.documents, id)) return null;
  if (!record || typeof record.body !== 'string' || createHash('sha256').update(record.body).digest('hex') !== record.sha256) {
    throw new Error('Private report evidence failed integrity verification.');
  }
  return record.body;
}

exports.readPrivateReportDocument = (id) => readDocument(id);
exports.readOptionalPrivateReportDocument = (id) => readDocument(id, true);
