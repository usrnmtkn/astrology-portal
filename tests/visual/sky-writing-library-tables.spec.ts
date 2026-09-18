import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';

// Planet language is stored once and shared across that planet's signs, which
// means the Virgo article can hold a reference to the Aries article. Editing a
// phrase must stay on the placement the owner opened; the shared source is
// reachable only from an action that names it.
const virgoKey = 'sky-placement/article/sun/virgo';
const ariesKey = 'sky-placement/article/sun/aries';
const sharedPlanetFunction = 'identity, vitality, and where you are meant to shine';
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const composition = (sources: Record<string, any>) => ({ version: 5, enabled: true, sources, modules: [] });

const row = (contentKey: string, ingress: Record<string, any>) => {
  const source = skyPlacementSourceRecords.get(contentKey)!;
  return {
    id: `package:${contentKey}`, content_key: contentKey, surface: 'sky', mode: 'in_depth', status: 'DRAFT',
    lane: 'reference', provider: 'tldrastro-fallback-architecture-v3', headline: source.headline,
    summary: source.summary, body: source.body_you, sections: { packageRecord: { ...source, contentKey, ingress } },
    facts: { fallbackArchitectureV3: true },
    source_snapshot: { sourcePackage: source.source_package, content_role: source.content_role },
    block_type: 'fallback_hook', event_type: 'fallback-hook', package_starter: true
  };
};

const fixtureRows: Record<string, ReturnType<typeof row>> = {
  [ariesKey]: row(ariesKey, composition({ planetFunction: { kind: 'planet', text: sharedPlanetFunction } })),
  [virgoKey]: row(virgoKey, composition({
    planetFunction: {
      kind: 'planet',
      reference: { contentKey: ariesKey, field: 'ingress.sources.planetFunction', sha256: sha256(sharedPlanetFunction) }
    },
    placementThesis: { kind: 'placement', text: 'Fixture Virgo thesis.' }
  }))
};

test('Editing a shared planet phrase stays on the placement that was opened', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'library-table-fixture'));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/admin/**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('variables') === 'true') {
      await route.fulfill({ json: { ok: true, variables: [] } });
      return;
    }
    const rows = (url.searchParams.get('contentKeys') ?? virgoKey).split(',').map(key => fixtureRows[key]).filter(Boolean);
    await route.fulfill({ json: { ok: true, rows: url.pathname.endsWith('/generated-content') ? rows : [], statuses: [], nextCursor: null } });
  });

  await page.goto('/#sky-writeups');
  await page.getByLabel('Sky placement planet or point').selectOption('sun');
  await page.getByLabel('Sky placement zodiac sign').selectOption('virgo');
  await page.getByLabel('Sky write-up motion').selectOption('direct');

  const map = page.getByRole('region', { name: 'Sky placement composition map' });
  await map.getByRole('tab', { name: 'Main template', exact: true }).click();
  const phrases = map.getByLabel('Editable phrase variables');

  // The browse surface is a table: one row per variable, with its writing beside it.
  const planetRow = phrases.locator('tbody tr').filter({ has: page.getByText('{{planetFunction}}', { exact: true }) });
  await expect(planetRow.locator('th[scope="row"] code')).toHaveText('{{planetFunction}}');
  await expect(planetRow.locator('td').first()).toContainText(sharedPlanetFunction);
  await expect(planetRow.getByRole('button', { name: 'Edit planet function', exact: true })).toBeVisible();

  await planetRow.getByRole('button', { name: 'Edit planet function', exact: true }).click();
  const editor = page.getByRole('dialog');
  const phrase = editor.getByRole('region', { name: 'Phrase variable editor' });
  const context = phrase.getByLabel('Phrase variable editing context');
  await expect(context).toContainText('Sun in Virgo');
  await expect(context).not.toContainText('Sun in Aries');

  // The shared words are readable in place, and changing them is an explicit choice.
  const field = phrase.getByRole('region', { name: 'Edit Planet function', exact: true });
  await expect(field).toContainText(sharedPlanetFunction);
  await expect(field).toContainText('shared with every Sun sign');
  await expect(field.getByRole('button', { name: 'Write a Virgo version instead', exact: true })).toBeVisible();
  await expect(field.getByRole('button', { name: `Open ${ariesKey} to change the shared words`, exact: true })).toBeVisible();

  // Every other phrase for this placement stays browsable as a table.
  const catalog = editor.getByRole('region', { name: 'Other writing library phrases' });
  const thesisRow = catalog.locator('tbody tr').filter({ has: page.getByText('{{placementThesis}}', { exact: true }) });
  await expect(thesisRow).toContainText('Fixture Virgo thesis.');
  await thesisRow.getByRole('button', { name: 'Edit placement thesis', exact: true }).click();
  await expect(context).toContainText('Sun in Virgo');
  await expect(phrase.getByRole('region', { name: 'Edit Placement thesis', exact: true })
    .getByLabel('Writing library Placement thesis')).toHaveValue('Fixture Virgo thesis.');

  // A local Virgo version replaces the shared link without leaving the placement.
  await catalog.locator('tbody tr').filter({ has: page.getByText('{{planetFunction}}', { exact: true }) })
    .getByRole('button', { name: 'Edit planet function', exact: true }).click();
  await field.getByRole('button', { name: 'Write a Virgo version instead', exact: true }).click();
  await expect(field.getByLabel('Writing library Planet function')).toBeVisible();
  await expect(context).toContainText('Sun in Virgo');
  expect(errors).toEqual([]);
});
