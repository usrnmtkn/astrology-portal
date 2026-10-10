import { fork } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Runs the actual Studio API handler with a private, isolated in-memory PostgREST store. */
export async function studioApiStore(rows: unknown[], options: { writing?: boolean; realRecheck?: boolean; lunationWriting?: boolean; uuidIds?: boolean; personalized?: boolean; chartFixtures?: Record<string, unknown[]> } = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'studio-formatting-'));
  const fixturePath = path.join(directory, 'rows.json');
  writeFileSync(fixturePath, JSON.stringify(rows));
  const chartPath = path.join(directory, "charts.json");
  writeFileSync(chartPath, JSON.stringify(options.chartFixtures ?? {}));
  const child = fork(path.resolve(options.lunationWriting ? 'tests/helpers/lunation-writing-api.mts' : options.writing ? 'tests/helpers/sky-review-workflow-api.mjs' : 'tests/helpers/calendar-review-api.mjs'), ['--ipc'], {
    env: { ...process.env, CALENDAR_REVIEW_FIXTURE: fixturePath, STUDIO_CHART_FIXTURE: chartPath, STUDIO_REAL_RECHECK: String(Boolean(options.realRecheck)), STUDIO_UUID_IDS: String(Boolean(options.uuidIds)), STUDIO_PERSONALIZED: String(Boolean(options.personalized)) }, execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });
  let sequence = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  let stderr = '';
  child.stderr?.on('data', data => { stderr += data; });
  await new Promise<void>((resolve, reject) => {
    child.on('message', (message: any) => {
      if (message.ready) return resolve();
      const task = pending.get(message.id);
      if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error)) : task.resolve(message.result); }
    });
    child.on('exit', code => { const error = new Error(`API fixture exited ${code}: ${stderr}`); reject(error); pending.forEach(task => task.reject(error)); });
  });
  return {
    call: (message: { method: string; body?: unknown; url?: string }) => new Promise<any>((resolve, reject) => {
      const id = ++sequence; pending.set(id, { resolve, reject }); child.send({ ...message, id });
    }),
    close: () => { child.kill(); rmSync(directory, { recursive: true, force: true }); }
  };
}
