import fs from 'node:fs';
import { Readable } from 'node:stream';

process.env.NODE_ENV = 'test';
process.env.CONTENT_GENERATION_SECRET = 'coverage-browser-fixture';
const { default: handler } = await import('../../api/admin/content-coverage.ts');
const readFile = fs.readFileSync;
if (process.argv.includes('--missing-required')) fs.readFileSync = (file, ...args) => {
  const value = readFile(file, ...args);
  if (!String(file).endsWith('/source-rows/transit-synastry-rows-v1.json')) return value;
  const source = JSON.parse(String(value));
  source.authoredCards.find(row => row.contentKey === 'authored/transit-aspect/sun/ascendant/hard').body_you = '';
  return JSON.stringify(source);
};
try {
  const req = Object.assign(Readable.from([]), { method: 'GET', headers: { authorization: 'Bearer coverage-browser-fixture' } });
  const res = { statusCode: 0, setHeader() {}, end(body) {
    if (this.statusCode !== 200) throw new Error(`Coverage fixture returned ${this.statusCode}`);
    process.stdout.write(body);
  } };
  await handler(req, res);
} finally { fs.readFileSync = readFile; }
