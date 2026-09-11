import fs from 'node:fs';
import path from 'node:path';

export function loadPrivacyPolicy(root = process.cwd()) {
  const raw = process.env.PROJECT_PRIVACY_POLICY || fs.readFileSync(process.env.PROJECT_PRIVACY_POLICY_FILE || path.join(root, '.privacy-policy.json'), 'utf8');
  const policy = JSON.parse(raw);
  if (policy.schema !== 'project-privacy/v1' || !Array.isArray(policy.patterns) || !policy.patterns.length) throw new Error('Missing project privacy policy.');
  return policy.patterns.map(rule => ({ id: rule.id, pattern: new RegExp(rule.regex, 'giu') }));
}

export function privacyMatches(value, policy) {
  const normalized = value.normalize('NFKC');
  return policy.filter(rule => { rule.pattern.lastIndex = 0; return rule.pattern.test(normalized); }).map(rule => rule.id);
}

/** Keep complete reader writing; redact only explicit owner-authorized identifiers. */
export function privateSafeExport(value, policy) {
  if (typeof value === 'string') {
    for (const rule of policy) value = value.replace(rule.pattern, '[private]');
    return value;
  }
  if (Array.isArray(value)) return value.map(item => privateSafeExport(item, policy));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [privateSafeExport(key, policy), privateSafeExport(child, policy)]));
  return value;
}
