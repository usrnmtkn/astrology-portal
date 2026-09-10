import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';
for (const width of [390, 1440])
    for (const theme of ['light', 'dark'] as const) {
        test(`Review Queue complete workflow ${width} ${theme}`, async ({ page }) => {
            test.setTimeout(90000);
            const child = fork(path.resolve('tests/helpers/sky-review-workflow-api.mjs'), ['--ipc'], { execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
            let sequence = 0, stderr = '';
            const pending = new Map<number, any>();
            child.stderr?.on('data', chunk => stderr += chunk);
            const ready = new Promise<void>((resolve, reject) => { child.on('message', (message: any) => { if (message.ready)
                return resolve(); const task = pending.get(message.id); if (task) {
                pending.delete(message.id);
                message.error ? task.reject(Error(message.error)) : task.resolve(message.result);
            } }); child.on('exit', code => reject(Error(`${code}: ${stderr}`))); });
            const call = (message: any) => new Promise<any>((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); child.send({ ...message, id }); });
            try {
                await ready;
                await page.setViewportSize({ width, height: 1000 });
                await page.emulateMedia({ colorScheme: theme });
                await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
                const errors: string[] = [];
                page.on('pageerror', error => errors.push(error.message));
                const missing = 'sky.aspect.mercury.trine.pluto.virgo.aquarius';
                await page.route('**/api/**', async (route) => {
                    const request = route.request(), url = new URL(request.url());
                    if (url.pathname === '/api/admin/generated-content') {
                        if (request.method() !== 'GET') {
                            const result = await call({ method: request.method(), url: url.pathname, body: request.postDataJSON() });
                            return route.fulfill({ status: result.status, json: result.payload });
                        }
                        let rows = await call({ method: 'rows' });
                        const key = url.searchParams.get('contentKey'), id = url.searchParams.get('id');
                        if (key)
                            rows = rows.filter((r: any) => r.content_key === key);
                        if (id)
                            rows = rows.filter((r: any) => r.id === id);
                        return route.fulfill({ json: { ok: true, rows, nextCursor: null } });
                    }
                    if (url.pathname === '/api/admin/sky-draft-writing') {
                        const result = await call({ method: 'POST', url: url.pathname, body: request.postDataJSON() });
                        return route.fulfill({ status: result.status, json: result.payload });
                    }
                    if (url.pathname === '/api/admin/content-live-status')
                        return route.fulfill({ json: { ok: true, statuses: await call({ method: 'statuses', body: request.postDataJSON() }) } });
                    if (url.pathname === '/api/admin/sky-review-horizon')
                        return route.fulfill({ json: { ok: true, horizon: { startDate: '2026-09-10', endDate: '2026-12-09', snapshotCount: 91, counts: { occurrences: 1, aspectCandidates: 1, placementCandidates: 0, activeWindows: 1 }, generationPlan: { reusableCandidatesMissingDrafts: 1, writerCalls: 1, reviewerCalls: 1 }, occurrences: [{ contentKey: missing, label: 'Mercury trine Pluto', kind: 'aspect', reviewStatus: 'missing_draft', windows: [{ startDate: '2026-09-10', endDate: '2026-09-11' }], activeDates: ['2026-09-10'], facts: {} }] } } });
                    return route.fulfill({ json: { ok: true, rows: [], records: [], nextCursor: null } });
                });
                await page.goto('/admin/content#review-queue');
                await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
                await expect(page.getByRole('button', { name: 'Ready for review', exact: true })).toBeVisible();
                await expect(page.locator('.admin-review-queue-row').filter({ hasText: 'Chiron sextile North Node' })).toHaveCount(0);
                await expect(page.locator('.admin-review-queue-row').filter({ hasText: 'source/sky-aspect-pair/sun-chiron' })).toHaveCount(0);
                await page.getByRole('button', { name: 'Needs changes', exact: true }).click();
                await page.locator('.admin-review-queue-row').filter({ hasText: 'Chiron sextile North Node' }).getByRole('button', { name: 'Edit', exact: true }).click();
                const editor = page.getByRole('dialog');
                const body = editor.getByRole('textbox', { name: 'Full passage / body', exact: true });
                await expect(editor.getByRole('button', { name: 'Approve & schedule', exact: true })).toBeDisabled();
                const original = await body.inputValue();
                await editor.getByRole('button', { name: 'Run writing checks', exact: true }).click();
                await expect(editor.getByRole('button', { name: 'Approve & schedule', exact: true })).toBeEnabled();
                await expect(body).toHaveValue(original);
                const revised = original + '\n\nFixture owner revision.';
                await body.fill(revised);
                await expect(editor.getByRole('button', { name: 'Run writing checks', exact: true })).toBeDisabled();
                await editor.getByRole('button', { name: 'Save', exact: true }).click();
                await expect(editor.getByRole('button', { name: 'Run writing checks', exact: true })).toBeEnabled();
                await expect(editor.getByRole('button', { name: 'Approve & schedule', exact: true })).toBeDisabled();
                await editor.getByRole('button', { name: 'Run writing checks', exact: true }).click();
                await expect(editor.getByRole('button', { name: 'Approve & schedule', exact: true })).toBeEnabled();
                await editor.getByRole('button', { name: 'Approve & schedule', exact: true }).click();
                await expect.poll(async () => (await call({ method: 'rows' })).find((r: any) => r.id === 'sky-fixture')?.status).toBe('LIVE');
                await expect(body).toHaveValue(revised);
                await expect(editor.getByRole('link', { name: 'Open reader view' })).toBeVisible();
                const readiness = editor.getByRole('region', { name: 'Review and publication readiness' });
                await expect(readiness).toContainText('Live');
                await readiness.getByRole('button', { name: 'Verify publication status' }).click();
                await expect(readiness.getByText('Live', { exact: true })).toBeVisible();
                await expect(editor.getByText('Version history (1)', { exact: true })).toBeVisible();
                await editor.getByRole('button', { name: 'Close', exact: true }).click();
                await page.getByRole('button', { name: 'Source library', exact: true }).click();
                await page.locator('.admin-review-queue-row').filter({ hasText: 'Sun-Chiron' }).getByRole('button', { name: 'Edit', exact: true }).click();
                await expect(editor.getByRole('textbox', { name: 'Source text', exact: true })).toBeVisible();
                await expect(editor.getByRole('button', { name: 'Publish to app', exact: true })).toHaveCount(0);
                await expect(editor).toContainText('Save edits, then Mark reviewed');
                await page.screenshot({ path: `test-results/review-source-${width}-${theme}.png` });
                await editor.getByRole('button', { name: 'Close', exact: true }).click();
                await page.getByRole('button', { name: 'Missing writing / upcoming' }).click();
                await page.getByRole('button', { name: 'Generate draft', exact: true }).click();
                await expect(editor.getByRole('textbox', { name: 'Full passage / body', exact: true })).toHaveValue(original);
                await expect(editor.getByRole('button', { name: 'Approve & schedule', exact: true })).toBeEnabled();
                await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
                await page.screenshot({ path: `test-results/review-generated-${width}-${theme}.png` });
                expect(errors).toEqual([]);
            }
            finally {
                child.kill();
            }
        });
    }
