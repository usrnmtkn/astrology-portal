// Executed as raw browser JavaScript so Node TypeScript transforms cannot alter it.
function installLoadingObserver({ instant, location, user, definition, scenario }) {
  const OriginalDate = Date;
  window.Date = class extends OriginalDate {
    constructor(...args) { if (args.length) super(...args); else super(instant); }
    static now() { return new OriginalDate(instant).getTime(); }
  };
  // A fresh context has no application data. Only a synthetic session and
  // explicit user preferences are seeded; reload keeps naturally filled caches.
  if (!localStorage.getItem('__loading_fixture_seeded')) {
    localStorage.setItem('__loading_fixture_seeded', '1');
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
    localStorage.setItem('tldrastro:theme', 'light');
    if (definition.authenticated) localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: `loading-${scenario}`, refresh_token: 'loading-refresh', expires_at: Date.now() / 1000 + 3600, token_type: 'bearer', user
    }));
  }
  const state = window.__loading = { marks: {}, tasks: [], shifts: [], workers: [], initialStorageKeys: Object.keys(localStorage) };
  const OriginalWorker = window.Worker;
  window.Worker = class extends OriginalWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => { const job = state.workers.findLast((x) => x.id === event.data?.id && x.end == null); if (job) { job.end = performance.now(); job.ok = event.data?.ok; } });
    }
    postMessage(value, ...rest) { state.workers.push({ id: value?.id, kind: value?.kind, start: performance.now() }); return super.postMessage(value, ...rest); }
  };
  for (const type of ['longtask', 'layout-shift']) try {
    new PerformanceObserver(list => { for (const entry of list.getEntries()) {
      if (type === 'longtask') state.tasks.push({ start: entry.startTime, duration: entry.duration });
      else if (!entry.hadRecentInput) state.shifts.push({ start: entry.startTime, value: entry.value });
    } }).observe({ type, buffered: true });
  } catch {}
  const visible = (element) => Boolean(element?.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
  const mark = (name, ready) => { if (ready && state.marks[name] == null) state.marks[name] = performance.now(); };
  const scope = () => document.querySelector(definition.kind === 'sky' ? '.sky-reading-layout' : definition.kind === 'calendar' ? '.lunar-calendar-view' : definition.kind.startsWith('you') ? '.you-page' : '.friends-page');
  const contentText = () => {
    const region = scope()?.cloneNode(true);
    // Saved-report availability and the social handle are independent
    // enhancements, not the selected natal/transit reading.
    region?.querySelectorAll('.you-report-actions, .you-profile-handle').forEach(element => element.remove());
    return region?.textContent ?? '';
  };
  state.readContentText = contentText;
  const sample = () => {
    const region = scope();
    mark('shell', visible(document.querySelector('nav[aria-label="Primary navigation"]'))
      || visible(document.querySelector('button[aria-label="Open menu"]')));
    if (visible(region)) {
      const busy = region.querySelector('[aria-busy="true"], .app-loading, [data-report-generating="true"]');
      const error = region.querySelector('[role="alert"]');
      if (error) state.failure = error.textContent;
      let usable = false, content = false;
      if (definition.kind === 'sky') {
        usable = state.marks.shell != null && visible(document.querySelector('.sky-header-date-button'));
        content = Boolean(region.querySelector('[aria-label="Daily sky summary"][aria-busy="false"]')) && region.querySelectorAll('.planet-placement-row--sky').length === 14 && !busy;
      } else if (definition.kind === 'calendar') {
        usable = performance.getEntriesByName('tldr:calendar.controls:ready').length > 0;
        content = performance.getEntriesByName('tldr:calendar.reading:ready').length > 0 && !busy
          && region.querySelector('[data-calendar-date="2026-09-21"]')
          && region.querySelectorAll('.calendar-stoic-card__excerpt').length === 5;
      } else if (definition.kind.startsWith('you')) {
        usable = region.querySelector('[aria-label="Profile summary"] h1')?.textContent === 'Loading Fixture';
        content = usable && !busy && !region.querySelector('[aria-label="Chart calculation"]') &&
          (definition.kind === 'you-natal' ? region.querySelectorAll('[aria-label="Bodies in signs and houses"] > *').length === 13
            && region.querySelectorAll('[aria-label="Empty houses"] .placement-table-row__description').length === 5 :
            Boolean(region.querySelector('[aria-label="Daily horoscope summary"]'))
            && Boolean(region.querySelector('[aria-label="This week\'s transits"]'))
            && region.querySelectorAll('[aria-label="Areas of your life"] .updates-aspect-row__description').length === 3
            && region.querySelectorAll('[aria-label="House transits"] .updates-aspect-row__description').length === 14);
      } else if (definition.kind === 'friends') {
        const rows = region.querySelectorAll('.manual-chart-select');
        usable = Boolean(rows.length || region.querySelector('[aria-label="No charts"]'));
        content = usable && rows.length === definition.count && !busy;
      }
      mark('usable', usable);
      if (content && !error && state.marks.content == null) state.contentText = contentText();
      mark('content', content && !error);
      if (state.marks.content != null && !state.fontsPending) {
        state.fontsPending = true;
        void document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
          if (document.fonts.check('400 16px Newsreader') && document.fonts.check('500 16px "Geist Mono"')) {
            mark('fonts', true);
            state.fontsText = contentText();
          }
          else state.failure = 'Required reader fonts unavailable';
        })));
      }
    }
    if (state.marks.fonts == null && !state.failure) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}
