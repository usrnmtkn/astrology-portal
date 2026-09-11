import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { privacyMatches } from './privacy-policy.mjs';

export function privacyBlobMatches(body, policy) {
  const matches = new Set(privacyMatches(body.toString('utf8'), policy));
  if (body.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 3, 4]))) {
    const result = spawnSync('python3', [fileURLToPath(new URL('./privacy-archive.py', import.meta.url))], {
      input: body, maxBuffer: 256 * 1024 * 1024, timeout: 30_000
    });
    if (result.status !== 0) throw new Error('Archive privacy inspection unavailable or failed.');
    for (const text of JSON.parse(result.stdout.toString('utf8'))) {
      for (const match of privacyMatches(text, policy)) matches.add(match);
    }
  }
  return [...matches];
}
