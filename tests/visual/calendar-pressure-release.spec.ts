import fs from 'node:fs';
import { expect, test } from '@playwright/test';

// Synthetic event facts exercise every approved identity on the real reader
// route. They are confined to this test and never enter production code.
test('Calendar renders all 21 approved refinements in full and after reload', async ({ page }) => {
  test.setTimeout(120_000);
  const packet = JSON.parse(fs.readFileSync('packages/astro-knowledge/review/calendar-collective-pressure-pass-2026-09-07/candidate-payloads.json', 'utf8'));
  const entries = Object.entries(packet.entries) as [string, { summary: string; body: string }][];
  const dateKey = '2026-09-12';
  const events = entries.map(([key]) => {
    const [, , a, aspect, b] = key.split('.');
    return { id: key, type: 'aspect', primary: true, glyph: '☌', title: `${a} ${aspect} ${b}`, startsAt: `${dateKey}T12:00:00.000Z`, dateKey, planets: [a, b], aspect };
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: {
    ok: true, calendar: {
      month: '2026-09', timeZone: 'America/New_York',
      location: { label: 'New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
      days: Array.from({ length: 7 }, (_, i) => { const key = `2026-09-${String(7 + i).padStart(2, '0')}`; return { date: `${key}T12:00:00.000Z`, dateKey: key, inMonth: true, moonSign: 'Libra', moonSignGlyph: '♎', moonPhase: 'Waxing Crescent', illumination: 0.04, activeAspects: [], events: key === dateKey ? events : [] }; }), events
    }
  } }));
  await page.goto(`/#calendar?view=day&date=${dateKey}`);
  for (let load = 0; load < 2; load++) {
    for (const [key, copy] of entries) {
      const [, , a, aspect, b] = key.split('.');
      const verb = { conjunction: 'conjoins', opposition: 'opposes', square: 'squares', trine: 'trines', sextile: 'sextiles' }[aspect];
      await page.getByRole('button', { name: new RegExp(`^${a}(?: Rx)? ${verb} ${b}(?: Rx)?$`, 'i') }).click();
      const region = page.getByRole('dialog', { name: 'Event detail' });
      // Exact full-body equality protects both opening and final sentence.
      await expect(region.locator('.calendar-reading__body')).toHaveText(copy.body, { timeout: 30_000 });
      await region.getByRole('button', { name: 'Close', exact: true }).click();
    }
    if (load === 0) await page.reload();
  }
});
