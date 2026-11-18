import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import SwissEph from "swisseph-wasm";
import { createServer } from "vite";
import calendarHandler from "../api/calendar.ts";
import { defaultLocation, getAstrodienstSky, getLunarCalendarDayEvents } from "../apps/web/src/services/ephemeris.ts";

test("Calendar week, month and Sky day feeds retain exact conjunctions and oppositions", async () => {
  const swe = new SwissEph();
  await swe.initSwissEph();
  const ids = { Sun: swe.SE_SUN, Moon: swe.SE_MOON, Mercury: swe.SE_MERCURY, Venus: swe.SE_VENUS };
  const fixtures = [
    { title: "Moon opposition Venus", date: "2026-10-25", instant: "2026-10-25T22:59:25Z", angle: 180 },
    { title: "Moon opposition Mercury", date: "2026-10-27", angle: 180 },
    { title: "Sun conjunction Venus", date: "2026-10-23", angle: 0 },
    { title: "Sun conjunction Mercury", date: "2026-11-04", angle: 0 }
  ];
  for (const timeZone of ["America/New_York", "Asia/Tokyo"]) {
    for (const mode of ["week", "month"]) {
      for (const fixture of fixtures) {
        const query = new URLSearchParams({ mode, detail: "full", date: fixture.date,
          lat: "40.7128", lon: "-74.006", timeZone });
        const res = { statusCode: 0, body: "", setHeader() {}, end(body: string) { this.body = body; } };
        await calendarHandler({ method: "GET", url: `/api/calendar?${query}` } as any, res as any);
        assert.equal(res.statusCode, 200);
        const calendar = JSON.parse(res.body).calendar;
        const events = calendar.events.filter((event: any) => event.title === fixture.title
          && Math.abs(Date.parse(event.startsAt) - Date.parse(`${fixture.date}T12:00:00Z`)) < 36 * 3_600_000);
        assert.equal(events.length, 1, `${mode} ${timeZone}: exactly one ${fixture.title}`);
        const event = events[0];
        if (fixture.instant) assert(Math.abs(Date.parse(event.startsAt) - Date.parse(fixture.instant)) < 2_000);
        const instant = new Date(event.startsAt);
        const jd = swe.julday(instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(),
          instant.getUTCHours() + instant.getUTCMinutes() / 60 + instant.getUTCSeconds() / 3600);
        const longitudes = event.planets.map((planet: keyof typeof ids) => swe.calc_ut(jd, ids[planet], swe.SEFLG_SWIEPH | swe.SEFLG_SPEED)[0]);
        const separation = Math.abs(((longitudes[0] - longitudes[1] + 540) % 360) - 180);
        assert(Math.abs(separation - fixture.angle) < 0.001, `${event.title}: direct Swiss exactness, rejecting wrap crossings`);
        const expectedKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(instant);
        assert.equal(event.dateKey, expectedKey);
        assert(calendar.days.find((day: any) => day.dateKey === expectedKey)?.events.some((item: any) => item.id === event.id));
        const dayEvents = await getLunarCalendarDayEvents({ ...defaultLocation, timeZone }, instant);
        assert(dayEvents.some(item => item.title === fixture.title), "Sky daily events must agree with Calendar");
      }
    }
  }
});

test("Full Moon Key aspects prioritize orb over earlier exact dates", async () => {
  const vite = await createServer({
    root: path.join(process.cwd(), "apps/web"), appType: "custom", logLevel: "silent", server: { middlewareMode: true, hmr: false },
    plugins: [{ name: "lunation-aspect-test-exports", enforce: "pre", transform(code, id) {
      if (id.endsWith("/src/App.tsx")) return code + "\nexport { currentSkyV4LunationDetailArticle, loadLunationArticleHoroscopes };";
      if (id.includes("/fallbackArchitectureV3/authored-inputs/") && id.endsWith(".json?url")) return `export default ${fs.readFileSync(id.slice(0, -4), "utf8")};`;
    } }]
  });
  try {
    const app = await vite.ssrLoadModule("/src/App.tsx");
    await app.loadLunationArticleHoroscopes();
    const runtime = await vite.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
    await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
    await app.loadContentRegistry("sky");
    const startsAt = "2026-10-26T04:11:50Z";
    const sky = await getAstrodienstSky(defaultLocation, new Date(startsAt), { includeTransitWindows: true, transitWindowPlanets: ["Moon"] });
    const event = { id: "full-moon-fixture", type: "lunation", title: "Full Moon in Taurus", startsAt,
      dateKey: "2026-10-26", glyph: "○", primary: true, sign: "Taurus" };
    const article = (aspects: typeof sky.aspects) => app.currentSkyV4LunationDetailArticle({ event, sky: { ...sky, aspects }, generatedContent: new Map() });
    const headings = (aspects: typeof sky.aspects) => article(aspects).sections.map((section: any) => section.heading);
    const expected = ["Sun Opposition Moon", "Moon Square Pluto"];
    assert.deepEqual(headings(sky.aspects), expected, "The exact luminary opposition and 0.3° Pluto square outrank separating Venus/Chiron");
    assert(article(sky.aspects).sections.every((section: any) => section.body.startsWith("October 26\n\n")), "Selected cards retain their verified exact dates");
    assert.deepEqual(headings([...sky.aspects].reverse()), expected, "Input ordering cannot change ranking");
    const withoutSun = sky.aspects.filter(aspect => ![aspect.from, aspect.to].includes("Sun"));
    assert.deepEqual(headings(withoutSun), ["Moon Square Pluto", "Moon Opposition Venus Rx"]);
    assert.equal(article([]).sections.length, 0);
    const pluto = sky.aspects.find(aspect => aspect.from === "Moon" && aspect.to === "Pluto")!;
    assert.equal(article([pluto, pluto]).sections.length, 1, "Duplicate contacts cannot consume both slots");
    const sunPluto = sky.aspects.find(aspect => aspect.from === "Sun" && aspect.to === "Pluto")!;
    const sunMoon = sky.aspects.find(aspect => [aspect.from, aspect.to].every(planet => ["Sun", "Moon"].includes(planet)))!;
    assert.deepEqual(headings([sunMoon, { ...pluto, orb: 0.3, separation: 89.66 }, { ...sunPluto, orb: 0.3, separation: 90.31 }]),
      ["Sun Opposition Moon", "Sun Square Pluto"], "Rank by calculated separation before display rounding");
    assert.equal(sky.aspects.find(aspect => aspect.to === "Venus" && aspect.from === "Moon")?.exactAt?.slice(0, 10), "2026-10-25");
    const reader = await app.loadLunationArticleHoroscopes();
    const identity = await vite.ssrLoadModule("/src/content/skyLunationAspectIdentity.ts");
    for (const [phase, eclipseType, sign, aspect, other, otherSign, kind] of [
      ['New Moon', undefined, 'Capricorn', 'conjunction', 'Venus', 'Aquarius', 'new-moon'],
      ['Full Moon', undefined, 'Gemini', 'square', 'Mars', 'Leo', 'full-moon'],
      ['New Moon', 'solar', 'Leo', 'conjunction', 'Venus', 'Leo', 'solar-eclipse'],
      ['Full Moon', 'lunar', 'Pisces', 'square', 'Uranus', 'Gemini', 'lunar-eclipse']
    ]) {
      const lunar = {startsAt:'2026-08-28T04:00:00Z', title:phase, sign, eclipseType};
      const contact = {from:'Moon', to:other, type:aspect, fromSign:sign, toSign:otherSign};
      const key = `sky.lunation.${kind}.${sign!.toLowerCase()}.${aspect}.${other!.toLowerCase()}.${otherSign!.toLowerCase()}`;
      assert.equal(identity.skyLunationAspectKey(lunar, contact), key);
      assert.equal(identity.skyLunationAspectKey(lunar, {...contact, from:other, to:'Moon', fromSign:otherSign, toSign:sign}), key);
      assert.equal(identity.skyLunationAspectKey({...lunar, sign:'Aries'}, contact), null);
      assert.equal(identity.skyLunationAspectKey({...lunar, title:'First Quarter Moon', eclipseType:undefined}, contact), null);
      assert.equal(identity.skyLunationAspectKey(lunar, {...contact, from:'Sun'}), null, 'Moon-context writing cannot replace a Sun reading');
    }
    const publications = await vite.ssrLoadModule("/src/content/contentPublicationState.ts");
    const detailLoader = await vite.ssrLoadModule("/src/services/skyDetailContent.ts");
    const calendarReader = await vite.ssrLoadModule("/src/features/calendar/LunarCalendar.tsx");
    const calendarKeys = await vite.ssrLoadModule("/src/features/calendar/calendarContentKeys.ts");
    for (const [kind, phase] of [['new-moon', 'new'], ['full-moon', 'full'], ['solar-eclipse', 'new'], ['lunar-eclipse', 'full']]) {
      publications.installContentPublications([]);
      const primary = `sky.lunation.${kind}.cancer.conjunction.mercury.cancer`;
      const reusable = `lunation.${phase}.cancer.conjunction.mercury.cancer`;
      const phaseBody = 'Complete synthetic phase-specific passage. The final sentence remains intact.';
      const saved = {id:'synthetic-phase-live',contentKey:reusable,body:phaseBody,updatedAt:'2026-11-18T12:00:00Z'};
      const phaseContent = new Map([[reusable,saved]]);
      const context = {type:'aspect',title:'Moon conjunction Mercury',startsAt:'2026-01-01T12:00:00Z',dateKey:'2026-01-01',
        planets:['Moon','Mercury'],aspect:'conjunction',fromSign:'Cancer',toSign:'Cancer',lunationAspectKey:primary};
      publications.installContentPublications([{content_key:reusable,state:'live',revision:1,row_id:saved.id,row_updated_at:saved.updatedAt,updated_at:saved.updatedAt}]);
      assert.deepEqual(identity.lunationAspectPublicationKeys(primary),[primary,reusable]);
      assert(calendarKeys.calendarEventGeneratedContentKeys(context).includes(reusable),'Calendar requests the corresponding reusable phase passage');
      assert.equal(reader.resolveCalendarLunationAspectReading(context,phaseContent)?.body,phaseBody);
      assert(calendarReader.normalizeCalendarEventSurface(context,calendarReader.liveCalendarEventContent(phaseContent,context),
        'January 1',null,null,null,phaseContent).sections.some(section=>section.body===phaseBody));
      assert.equal(reader.resolveCalendarLunationAspectReading(context,new Map([[reusable,{...saved,updatedAt:'2000-01-01T00:00:00Z'}]]))?.body,'',
        'A stale reusable publication cannot reveal older writing');
      const phaseReader = await vite.ssrLoadModule('/src/content/lunationAspectReading.ts');
      const phaseEvent = {startsAt:context.startsAt,phase:`${phase}-moon`,sign:'Cancer',title:`${phase === 'new' ? 'New' : 'Full'} Moon in Cancer`};
      const contact = {from:'Moon',to:'Mercury',type:'conjunction',fromSign:'Cancer',toSign:'Cancer'};
      assert.equal(phaseReader.resolveLunationAspectReading(phaseEvent,contact,[],phaseContent)?.body,phaseBody);
      assert.equal(phaseReader.resolveLunationAspectReading(phaseEvent,contact,[],new Map([[reusable,{...saved,updatedAt:'2000-01-01T00:00:00Z'}]]))?.body,'',
        'Dated lunar articles also reject stale reusable writing');
      const specific={...saved,id:'synthetic-specific-live',contentKey:primary,body:'Complete synthetic event-specific passage.'};
      phaseContent.set(primary,specific);
      publications.installContentPublications([{content_key:primary,state:'live',revision:1,row_id:specific.id,row_updated_at:specific.updatedAt,updated_at:specific.updatedAt}]);
      assert.equal(reader.resolveCalendarLunationAspectReading(context,phaseContent)?.body,specific.body,'The earlier event-specific reading retains precedence');
      publications.installContentPublications([{content_key:primary,state:'retired',revision:2,row_id:null,row_updated_at:null,updated_at:specific.updatedAt}]);
      assert.equal(reader.resolveCalendarLunationAspectReading(context,phaseContent)?.body,'','Retirement cannot resurrect the reusable passage underneath');
    }
    assert.deepEqual(identity.lunationAspectPublicationKeys('sky.aspect.moon.conjunction.mercury'),[],'Ordinary Moon contacts do not borrow phase copy');
    publications.installContentPublications([]);
    const lunarAt = "2026-08-28T04:18:32.999Z";
    const lunarSky = await getAstrodienstSky(defaultLocation, new Date(lunarAt), { includeTransitWindows: true, transitWindowPlanets: [] });
    const events = await getLunarCalendarDayEvents(defaultLocation, new Date(lunarAt));
    const eclipse = events.find(event => event.eclipseType === 'lunar')!;
    const contact = events.find(event => event.aspect === 'square' && event.planets?.includes('Moon') && event.planets?.includes('Uranus'))!;
    const key = 'sky.lunation.lunar-eclipse.pisces.square.uranus.gemini';
    assert.equal(contact.lunationAspectKey, key, 'Calendar derives the same eclipse context from real Swiss facts');
    const january = await getLunarCalendarDayEvents(defaultLocation, new Date('2026-01-18T16:00:00Z'));
    const venus = january.find(event => event.aspect === 'conjunction' && event.planets?.includes('Moon') && event.planets?.includes('Venus'))!;
    assert.equal(venus.fromSign, 'Aquarius', 'The exact contact retains its independently calculated sign');
    assert.equal(venus.lunationAspectKey, 'sky.lunation.new-moon.capricorn.conjunction.venus.aquarius',
      'An out-of-sign contact uses the signs at the lunation, without rewriting exact-event facts');
    const utc = await getLunarCalendarDayEvents({...defaultLocation,timeZone:'UTC'},new Date('2026-01-19T12:00:00Z'));
    assert.equal(utc.find(event=>event.aspect==='conjunction'&&event.planets?.includes('Moon')&&event.planets?.includes('Venus'))?.lunationAspectKey,
      venus.lunationAspectKey,'The same physical contact retains its lunar source across a civil-day boundary');
    assert.equal(await reader.datedLunationAspectEvent(defaultLocation, contact.startsAt, 'moon', 'square', 'uranus') !== undefined, true);
    assert.equal(identity.skyLunationAspectKey(eclipse, {from:'Moon',to:'Uranus',type:'square',fromSign:'Aries',toSign:'Gemini'}), null, 'Wrong endpoint sign cannot select lunar copy');
    assert(!(await getLunarCalendarDayEvents(defaultLocation, new Date('2026-08-29T16:00:00Z'))).some(event => event.lunationAspectKey === key), 'Ordinary days do not carry the eclipse contact');
    const mercuryKey = 'sky.lunation.lunar-eclipse.pisces.opposition.mercury.virgo';
    const mercuryRow = {id:'synthetic-lunar-mercury-live',contentKey:mercuryKey,body:'Complete synthetic lunar Mercury passage.',updatedAt:'2026-11-17T12:00:00Z'};
    const body = 'Synthetic lunar opening.\n\nThe complete approved final sentence remains intact.';
    const row = { id: 'synthetic-lunar-live', contentKey: key, body, updatedAt: '2026-11-17T12:00:00Z' };
    const content = new Map([[key, row], [mercuryKey, mercuryRow]]);
    publications.installContentPublications([{content_key: key, state: 'live', revision: 1,
      row_id: row.id, row_updated_at: row.updatedAt, updated_at: row.updatedAt}, {content_key:mercuryKey,state:'live',revision:1,
      row_id:mercuryRow.id,row_updated_at:mercuryRow.updatedAt,updated_at:mercuryRow.updatedAt}]);
    const keys = reader.lunationArticleSnapshotKeys(lunarSky, eclipse);
    assert(keys.includes(key));
    assert(keys.includes('sky.aspect.sun.opposition.moon'), 'Dated lunar hydration includes exact general aspect publications');
    assert(keys.includes('sky.aspect.sun.conjunction.mercury'), 'Both original Sun aspect sources are requested');
    assert(calendarKeys.calendarEventGeneratedContentKeys(contact).includes(key));
    const loaded = await detailLoader.loadSkyDetailContent(lunarSky, new Map([[key, {...row, updatedAt: '2000-01-01T00:00:00Z'}]]), keys, async requested => {
      assert(requested.includes(key), 'Cold/reload hydration replaces stale versions');
      return content;
    }, []);
    const lunarArticle = app.currentSkyV4LunationDetailArticle({event: eclipse, sky: lunarSky, generatedContent: loaded});
    assert.deepEqual(lunarArticle.sections.map(section => section.heading), ['Sun Opposition Moon', 'Sun Conjunction Mercury', 'Moon Square Uranus'],
      'Preserve the two calculated leads and append the approved lunar contact');
    assert(lunarArticle.sections[2].body.endsWith(body), 'The additional lunar passage stays whole');
    assert.equal(calendarReader.normalizeCalendarEventSurface(contact, row, 'August 28', null, null, null, loaded).sections[0].body, body);
    await assert.rejects(detailLoader.loadSkyDetailContent(lunarSky, new Map(), keys, async () => new Map(), []), /current article publication/);
    assert.equal(reader.resolveSkyLunationAspectReading(eclipse, lunarSky.aspects.find(a => a.from === 'Moon' && a.to === 'Uranus'), lunarSky.positions,
      new Map([[key, {...row, updatedAt: '2000-01-01T00:00:00Z'}]])).body, '', 'A stale authoritative source cannot reveal older copy');
    publications.installContentPublications([{content_key: key, state: 'retired', revision: 2, row_id: null, row_updated_at: null, updated_at: row.updatedAt}]);
    assert.equal(calendarReader.normalizeCalendarEventSurface(contact, row, 'August 28', null, null, null, content).sections.length, 0);
    const remaining = app.currentSkyV4LunationDetailArticle({event:eclipse,sky:lunarSky,generatedContent:content});
    assert.equal(remaining.sections[2].heading,'Moon Opposition Mercury','A remaining approved lunar contact may share a planet with a lead');
    assert(remaining.sections[2].body.endsWith(mercuryRow.body));
  } finally {
    await vite.close();
  }
});
