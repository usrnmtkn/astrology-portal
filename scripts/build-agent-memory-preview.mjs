import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadEnv } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(root, 'apps/web');
const env = loadEnv('production', webRoot, '');
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Owner sign-in is not configured. Set the existing project’s VITE_SUPABASE_URL and publishable key in apps/web/.env.local before building a memory preview.');
const parsedUrl = new URL(url);
if (!['https:', 'http:'].includes(parsedUrl.protocol)) throw new Error('Invalid Supabase URL');
let publicKey = key.startsWith('sb_publishable_');
if (!publicKey && key.split('.').length === 3) {
  try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { /* Invalid key. */ }
}
if (!publicKey) throw new Error('The browser requires a publishable or anon key. Privileged keys are not permitted.');
execFileSync('npm', ['run', 'build:web'], { cwd: root, stdio: 'inherit', env: { ...process.env, VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key } });
// Verification marker contains no credentials. Preview startup checks the matching server project.
fs.writeFileSync(path.join(webRoot, 'dist/memory-preview-config.json'), JSON.stringify({ ownerSignInConfigured: true, supabaseUrl: parsedUrl.origin }) + '\n');
console.log('Memory preview built with owner sign-in enabled.');
