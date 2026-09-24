import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import lighthouse from 'lighthouse';
import BaseGatherer from 'lighthouse/core/gather/base-gatherer.js';
import { Audit } from 'lighthouse/core/audits/audit.js';
import puppeteer from 'puppeteer-core';
import { chromium } from '@playwright/test';

function readReaderState(route) {
  const visible = element => Boolean(element && element.getBoundingClientRect().height && getComputedStyle(element).visibility !== 'hidden');
  const selector = route === 'sky' ? '.sky-reading-layout__content .planet-placement-row--sky:not(.card-skeleton)' : '.calendar-stoic-card:not(.card-skeleton)';
  return {
    cards: [...document.querySelectorAll(selector)].filter(visible).length,
    loading: [...document.querySelectorAll('.sky-reading-layout__loading, .calendar-day-panel .card-skeleton')].filter(visible).length,
    summary: visible(document.querySelector(route === 'sky' ? '[aria-label="Daily sky summary"]' : '[aria-label="Selected lunar day"] .calendar-sky-card__body:not([aria-busy="true"])')),
    errors: [...document.querySelectorAll('[role="alert"]')].filter(visible).map(element => element.textContent),
    viewport: { width: innerWidth, height: innerHeight },
    url: location.href
  };
}

class ReaderReadiness extends BaseGatherer {
  meta = { supportedModes: ['navigation'] };
  constructor(route, screenshot) { super(); this.route = route; this.screenshot = screenshot; }
  async stopSensitiveInstrumentation(context) {
    this.state = await context.driver.executionContext.evaluate(readReaderState, { args: [this.route] });
    const capture = await context.driver.defaultSession.sendCommand('Page.captureScreenshot');
    await writeFile(this.screenshot, Buffer.from(capture.data, 'base64'));
  }
  getArtifact() { return this.state; }
}

class ReaderReadinessAudit extends Audit {
  static get meta() { return { id: 'reader-readiness', title: 'Complete reader content loaded', failureTitle: 'Reading did not finish loading', description: 'Checks the reading during the measured mobile navigation.', requiredArtifacts: ['ReaderReadiness', 'ConsoleMessages'] }; }
  static audit(artifacts) {
    const state = artifacts.ReaderReadiness;
    state.errors.push(...artifacts.ConsoleMessages.filter(message => message.level === 'error').map(message => message.text));
    return { score: Number(state.cards > 0 && state.loading === 0 && state.summary && state.errors.length === 0) };
  }
}

export function validateReaderAudit(lhr, state, route) {
  assert(!lhr.runtimeError, lhr.runtimeError?.message);
  const requests = lhr.audits['network-requests'].details.items;
  const invalidHosts = requests.filter(request => new URL(request.url).hostname.endsWith('.test'));
  assert.equal(invalidHosts.length, 0, 'Invalid Lighthouse environment: a synthetic .test service was requested');
  assert.equal(state.errors.length, 0, 'The audited page ended in a reader error state');
  assert.equal(state.loading, 0, 'The audit ended before the reading resolved');
  assert(state.cards > 0, `${route} did not render reader cards during the audit`);
  if (route === 'sky') assert.equal(state.cards, 14, 'Sky must render all 14 placements');
  assert(state.summary, 'The complete reading must be visible, not just the page shell');
}

export async function auditReader(baseURL, outputDirectory, throttlingMethod = 'devtools') {
  const url = new URL(baseURL);
  assert(['http:', 'https:'].includes(url.protocol));
  assert(!url.hostname.endsWith('.test'), 'Supply a real production/preview URL or a fully configured local server');
  await mkdir(outputDirectory, { recursive: true });
  const results = [];
  for (const route of ['sky', 'calendar']) {
    // A new browser per route preserves a genuinely cold cache.
    const browser = await puppeteer.launch({ executablePath: chromium.executablePath(), headless: true });
    try {
      const page = await browser.newPage();
      url.hash = route;
      // Readiness is captured before trace collection stops. Reading the page
      // after Lighthouse disconnects can inspect a resized/reloaded document.
      const readiness = new ReaderReadiness(route, resolve(outputDirectory, `${route}.png`));
      const result = await lighthouse(url.href, { output: ['json', 'html'], logLevel: 'error' }, {
        extends: 'lighthouse:default',
        artifacts: [{ id: 'ReaderReadiness', gatherer: { instance: readiness } }],
        audits: [ReaderReadinessAudit],
        categories: { reader: { title: 'Reader readiness', auditRefs: [{ id: 'reader-readiness', weight: 1 }] } },
        settings: { onlyCategories: ['performance', 'reader'], throttlingMethod, pauseAfterFcpMs: 20000, pauseAfterLoadMs: 20000, maxWaitForLoad: 60000 }
      }, page);
      assert(result, 'Lighthouse returned no result');
      await writeFile(resolve(outputDirectory, `${route}.json`), JSON.stringify(result.lhr, null, 2));
      await writeFile(resolve(outputDirectory, `${route}.html`), result.report[1]);
      const state = result.artifacts.ReaderReadiness;
      await writeFile(resolve(outputDirectory, `${route}-readiness.json`), JSON.stringify(state, null, 2));
      validateReaderAudit(result.lhr, state, route);
      const metrics = { route, state, performance: result.lhr.categories.performance.score, cls: result.lhr.audits['cumulative-layout-shift'].numericValue, lcp: result.lhr.audits['largest-contentful-paint'].numericValue, throttlingMethod };
      console.log(JSON.stringify(metrics));
      results.push(metrics);
    } finally { await browser.close(); }
  }
  return results;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [baseURL, directory = 'test-results/reader-lighthouse', throttling = 'devtools'] = process.argv.slice(2);
  assert(baseURL, 'Usage: npm run qa:reader-lighthouse -- https://deployment.example /private/output [devtools|simulate]');
  await auditReader(baseURL, resolve(directory), throttling);
}
