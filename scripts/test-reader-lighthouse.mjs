import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateReaderAudit } from './qa-reader-lighthouse.mjs';

const report = (url = 'https://reader.example/api/sky') => ({ audits: { 'network-requests': { details: { items: [{ url }] } } } });
const ready = () => ({ errors: [], loading: 0, cards: 14, summary: true });
test('accepts a complete reading in the measured navigation', () => {
  validateReaderAudit(report(), ready(), 'sky');
  validateReaderAudit(report(), { ...ready(), cards: 2 }, 'calendar');
});
test('rejects the synthetic Supabase environment from the failed mobile audit', () => {
  assert.throws(() => validateReaderAudit(report('https://visual-smoke.supabase.test/rest/v1/content_publications'), ready(), 'sky'), /synthetic/);
});
test('rejects a fast error page, incomplete reading, and runtime failures', () => {
  for (const change of [{ errors: ['Sky could not load'] }, { loading: 3 }, { cards: 13 }, { summary: false }]) {
    assert.throws(() => validateReaderAudit(report(), { ...ready(), ...change }, 'sky'));
  }
  assert.throws(() => validateReaderAudit({ ...report(), runtimeError: { message: 'Navigation failed' } }, ready(), 'sky'), /Navigation failed/);
});
