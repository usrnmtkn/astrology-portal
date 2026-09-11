import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const ids = new Set(['general-2026', 'work-money-2026', 'love-connection-2026', 'personal-health-2026'].map(id => `private:report/${id}`));

/** Original owner evidence lives in protected storage, never in Git or web assets. */
export function readPrivateReportDocument(id) {
  if (!ids.has(id)) throw new Error('Unknown private report document.');
  const encoded = process.env.PRIVATE_REPORT_DOCUMENTS;
  let raw;
  if (encoded) raw = gunzipSync(Buffer.from(encoded, 'base64'), { maxOutputLength: 1024 * 1024 }).toString('utf8');
  else if (!process.env.VERCEL && !process.env.CI) {
    const file = path.join(process.cwd(), '.private-documents/reports.json');
    if (fs.existsSync(file)) raw = fs.readFileSync(file, 'utf8');
  }
  if (!raw) throw new Error('Private report evidence is unavailable. Configure protected document storage.');
  const corpus = JSON.parse(raw);
  const record = corpus.schema === 'private-reports/v1' && corpus.documents?.[id];
  if (!record || typeof record.body !== 'string' || createHash('sha256').update(record.body).digest('hex') !== record.sha256) {
    throw new Error('Private report evidence failed integrity verification.');
  }
  return record.body;
}
