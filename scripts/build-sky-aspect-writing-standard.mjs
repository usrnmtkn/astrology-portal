import fs from 'node:fs';
import { createHash } from 'node:crypto';

const source = 'docs/writing/SKY_CALENDAR_ASPECT_STANDARD.md';
const target = 'src/astro-writing/skyAspectWritingStandard.generated.cjs';
const text = fs.readFileSync(source, 'utf8');
const sha256 = createHash('sha256').update(text).digest('hex');
const output = `// Generated from ${source}; preserve the complete owner standard.\nmodule.exports = ${JSON.stringify({ text, sha256 }, null, 2)};\n`;
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== output) throw new Error('Sky/Calendar aspect standard artifact is stale.');
} else fs.writeFileSync(target, output);
