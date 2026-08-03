#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/station-cards-week-openers-v1.json"
);
const rows = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const rowsWithoutApprovedWeeklyOverview = rows.filter((row) => row.surface !== "weekly-overview");
const reviewCandidatePath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/calendar-weekly-overview-2026-08-03-owner-review-candidate.json"
);
const reviewCandidate = JSON.parse(fs.readFileSync(reviewCandidatePath, "utf8"));
const pendingReviewCandidatePath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/calendar-weekly-overview-2026-08-10-owner-review-candidate.json"
);
const pendingReviewCandidate = JSON.parse(fs.readFileSync(pendingReviewCandidatePath, "utf8"));
const vite = await createServer({
  configFile: false,
  root: path.join(repoRoot, "apps/web"),
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
  logLevel: "error"
});

try {
  const fallbackRuntime = await vite.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
  await fallbackRuntime.loadDeferredFallbackArchitectureV3Bundle();
  const weekly = await vite.ssrLoadModule("/src/services/weeklyHoroscope.ts");

  assert.deepEqual(weekly.weeklyContentImportCounts, {
    total: rows.length,
    station: rows.filter((row) => row.surface === "weekly-station").length,
    openers: rows.filter((row) => row.surface === "weekly-opener").length,
    overviews: rows.filter((row) => row.surface === "weekly-overview").length,
    readerEligible: rows.length,
    needsReview: 0
  });
  assert.equal(weekly.weeklyContentImportCounts.total, rows.length);
  assert.equal(rows.filter((row) => row.surface === "weekly-station").length, 18);
  assert.equal(rows.filter((row) => row.surface === "weekly-opener").length, 6);
  assert.equal(rows.filter((row) => row.surface === "weekly-overview").length, 1);
  assert.ok(rows.every((row) => ["approved", "reviewed"].includes(row.review_status)));
  assert.ok(rows.every((row) => !/SOURCE_GAP/u.test(`${row.headline}\n${row.body}`)));
  assert.equal(reviewCandidate.reviewStatus, "approved");
  assert.equal(reviewCandidate.ownerApproved, true);
  assert.equal(reviewCandidate.promotionAuthorized, true);
  assert.equal(reviewCandidate.canonical, true);
  assert.equal(reviewCandidate.serving, true);
  assert.ok(
    rows.some((row) => row.contentKey === reviewCandidate.contentKey),
    "Exact-copy owner approval must promote the weekly overview into reader-serving source rows."
  );
  assert.equal(pendingReviewCandidate.reviewStatus, "needs_review");
  assert.equal(pendingReviewCandidate.ownerApproved, false);
  assert.equal(pendingReviewCandidate.promotionAuthorized, false);
  assert.equal(pendingReviewCandidate.canonical, false);
  assert.equal(pendingReviewCandidate.serving, false);
  assert.ok(
    rows.every((row) => row.contentKey !== pendingReviewCandidate.contentKey),
    "A review-only weekly overview candidate must not enter reader-serving source rows."
  );
  assert.ok(
    pendingReviewCandidate.body.trim().split(/\s+/u).length >= 130
      && pendingReviewCandidate.body.trim().split(/\s+/u).length <= 220,
    "A review-only weekly overview candidate should meet the same compact editorial length as serving copy."
  );
  const weeklyCopyRows = rows.filter((row) => row.weeklyOverview);
  const prohibitedWeeklyLanguage = /the harvest|the universe is inviting you|plant seeds|dreams take root|step into the light|walk through the portal|manifestation|energetic upgrade|a fresh chapter is calling|what is meant for you|the energy asks you|this activation|alignment|this placement becomes|the planet carries the thread|keep shrinking|edit yourself|on paper|shared trust|full write-up coming soon|\bperformance\b|\bthings\b|—/iu;
  assert.ok(weeklyCopyRows.every((row) => row.headline === row.weeklyHeadline));
  assert.ok(weeklyCopyRows.every((row) => row.body === row.weeklyOverview));
  assert.ok(weeklyCopyRows.every((row) => {
    const wordCount = row.weeklyOverview.trim().split(/\s+/u).length;
    return wordCount >= 130 && wordCount <= 220;
  }), "Weekly overview rows stay compact but substantial.");
  assert.ok(weeklyCopyRows.every((row) => !prohibitedWeeklyLanguage.test(
    `${row.weeklyHeadline}\n${row.weeklyOverview}`
  )), "Weekly overview rows must not contain prohibited language or em dashes.");

  const sundayBefore = weekly.weeklyWindowFor(new Date("2026-08-02T23:59:00Z"), "America/New_York");
  const sundayAfter = weekly.weeklyWindowFor(new Date("2026-08-03T00:00:00Z"), "America/New_York");
  assert.equal(sundayBefore.weekStart, "2026-07-27");
  assert.equal(sundayBefore.weekEnd, "2026-08-02");
  assert.equal(sundayAfter.weekStart, "2026-08-03");
  assert.equal(sundayAfter.weekEnd, "2026-08-09");

  const mondayAriesTone = weekly.resolveCalendarWeeklyMoonTone({
    mondayDateKey: "2026-08-03",
    moonSign: "Aries"
  });
  assert.equal(mondayAriesTone?.headline, "Moon in Aries sets the emotional tone");
  assert.equal(mondayAriesTone?.contentKey, "authored/calendar-weekly-moon/aries");
  assert.match(
    mondayAriesTone?.body ?? "",
    /tired of waiting for permission that's never coming/iu,
    "The Calendar weekly tone must come from the approved owner-authored Monday Moon library."
  );
  assert.equal(
    weekly.resolveCalendarWeeklyMoonTone({
      mondayDateKey: "2026-08-02",
      moonSign: "Pisces"
    }),
    undefined,
    "The weekly emotional tone must be anchored to Monday rather than the first visible Sunday."
  );
  const mondayCancerTone = weekly.resolveCalendarWeeklyMoonTone({
    mondayDateKey: "2026-08-10",
    moonSign: "Cancer"
  });
  assert.equal(
    mondayCancerTone?.contentKey,
    "authored/calendar-weekly-moon/cancer/variant-2",
    "An explicitly rejected Cancer base card must fail over to an already-approved owner variant."
  );
  assert.doesNotMatch(
    mondayCancerTone?.body ?? "",
    /The Cancer Moon doesn't make you weak; it makes you aware\./u
  );

  const stationEvent = {
    id: "station-mercury-retrograde-test",
    type: "station",
    title: "Mercury stations retrograde",
    startsAt: "2026-08-01T12:00:00.000Z",
    dateKey: "2026-08-01",
    glyph: "☿",
    primary: true,
    planet: "Mercury",
    sign: "Leo",
    direction: "retrograde"
  };
  const gatedRows = rows.map((row) => (
    row.contentKey === "authored/station/mercury/rx"
      ? { ...row, review_status: "needs_review" }
      : row
  ));
  const gatedStation = weekly.resolveWeeklyStationCopy(stationEvent, gatedRows);
  const approvedStation = weekly.resolveWeeklyStationCopy(stationEvent, rows);
  assert.notEqual(gatedStation.body, rows[0].body, "Needs-review station copy must stay out of reader view.");
  assert.equal(approvedStation.body, rows[0].body, "Approval must switch station copy without a code change.");

  const personalizedChironStation = weekly.resolveWeeklyStationCopy({
    ...stationEvent,
    id: "station-chiron-retrograde-test",
    title: "Chiron stations retrograde",
    planet: "Chiron",
    sign: "Taurus"
  }, rows, "Gemini");
  assert.equal(
    personalizedChironStation.headline,
    "Chiron stations retrograde in your 12th house"
  );
  assert.equal(
    personalizedChironStation.driverLabel,
    "Chiron stations retrograde in your 12th house"
  );
  assert.match(
    personalizedChironStation.body,
    /Chiron in your 12th house brings quiet grief, old anxieties, and unspoken losses back to the surface/u
  );

  const lunationEvent = {
    id: "new-moon-test",
    type: "lunation",
    title: "New Moon",
    startsAt: "2026-08-04T12:00:00.000Z",
    dateKey: "2026-08-04",
    glyph: "●",
    primary: true,
    sign: "Leo"
  };
  const gatedOpeners = rows.map((row) => (
    row.contentKey === "authored/week-opener/new-moon"
      ? { ...row, review_status: "needs_review" }
      : row
  ));
  assert.equal(weekly.resolveWeeklyOpener("lunation", [lunationEvent], gatedOpeners), undefined);
  const opener = weekly.resolveWeeklyOpener("lunation", [lunationEvent], rows);
  assert.ok(opener);
  assert.equal(opener.headline, "New Moon in Leo");
  assert.equal(opener.contentKey, "fallback-hook/lunation-sign-compact/new-moon/leo");
  assert.match(opener.body, /Leo/u);
  assert.match(opener.body, /real desire|borrowed approval/iu);
  assert.doesNotMatch(opener.body, /terms you set first|committee decision|audience poll/iu);
  assert.ok(opener.body.trim().split(/\s+/u).length < 60);
  assert.doesNotMatch(opener.body, /\{\{/u);

  const virgoNewMoon = {
    ...lunationEvent,
    id: "new-moon-virgo-test",
    title: "New Moon",
    sign: "Virgo"
  };
  const virgoOpener = weekly.resolveWeeklyOpener("lunation", [virgoNewMoon], rows);
  assert.ok(virgoOpener);
  assert.equal(virgoOpener.headline, "New Moon in Virgo");
  assert.equal(virgoOpener.contentKey, "fallback-hook/lunation-sign-compact/new-moon/virgo");
  assert.match(virgoOpener.body, /routine, not a speech|one measurable change/iu);
  assert.doesNotMatch(virgoOpener.body, /terms you set first|new plan|place in the schedule/iu);
  assert.ok(virgoOpener.body.trim().split(/\s+/u).length < 60);

  const ariesFullMoon = {
    ...lunationEvent,
    id: "full-moon-aries-test",
    title: "Full Moon",
    sign: "Aries"
  };
  const ariesOpener = weekly.resolveWeeklyOpener("lunation", [ariesFullMoon], rows);
  assert.ok(ariesOpener);
  assert.equal(ariesOpener.headline, "Full Moon in Aries");
  assert.equal(ariesOpener.contentKey, "fallback-hook/lunation-sign-compact/full-moon/aries");
  assert.match(ariesOpener.body, /line got crossed|temperature marks the spot/iu);
  assert.doesNotMatch(ariesOpener.body, /consequence still needs a plan/iu);
  assert.ok(ariesOpener.body.trim().split(/\s+/u).length < 60);
  const quarterMoonEvent = {
    ...lunationEvent,
    id: "last-quarter-test",
    title: "Last Quarter Moon in Taurus",
    sign: "Taurus",
    primary: true
  };
  assert.equal(weekly.calendarWeekTypeFor([lunationEvent]), "lunation");
  assert.equal(
    weekly.calendarWeekTypeFor([quarterMoonEvent, stationEvent]),
    "station",
    "Quarter Moon events must not replace a more useful weekly station forecast."
  );
  assert.ok(
    weekly.calendarWeeklyEventRank(stationEvent).finalScore
      > weekly.calendarWeeklyEventRank(quarterMoonEvent).finalScore,
    "A station must rank above an exact lunar quarter."
  );

  const currentWeekEvents = [
    {
      id: "chiron-station-2026-08-02",
      type: "station",
      title: "Chiron stations retrograde",
      startsAt: "2026-08-02T12:00:00.000Z",
      dateKey: "2026-08-02",
      glyph: "⚷",
      primary: true,
      planet: "Chiron",
      direction: "retrograde"
    },
    {
      id: "last-quarter-2026-08-05",
      type: "lunation",
      title: "Last Quarter Moon in Taurus",
      startsAt: "2026-08-05T10:00:00.000Z",
      dateKey: "2026-08-05",
      glyph: "◐",
      primary: true,
      sign: "Taurus"
    },
    {
      id: "venus-libra-2026-08-06",
      type: "ingress",
      title: "Venus enters Libra",
      startsAt: "2026-08-06T12:00:00.000Z",
      dateKey: "2026-08-06",
      glyph: "♀",
      primary: true,
      planet: "Venus",
      toSign: "Libra"
    },
    {
      id: "sun-saturn-2026-08-07",
      type: "aspect",
      title: "Sun trine Saturn",
      startsAt: "2026-08-07T12:00:00.000Z",
      dateKey: "2026-08-07",
      glyph: "△",
      primary: true,
      planets: ["Sun", "Saturn"],
      aspect: "trine"
    }
  ];
  const approvedWeekEvents = [
    ...currentWeekEvents,
    {
      id: "mercury-leo-2026-08-09",
      type: "ingress",
      title: "Mercury enters Leo",
      startsAt: "2026-08-09T12:00:00.000Z",
      dateKey: "2026-08-09",
      glyph: "☿",
      primary: true,
      planet: "Mercury",
      toSign: "Leo"
    }
  ];
  const approvedCurrentWeekOverview = weekly.resolveCalendarWeeklyOverview({
    weekStart: "2026-08-03",
    weekEnd: "2026-08-09",
    events: approvedWeekEvents,
    rows
  });
  assert.equal(
    approvedCurrentWeekOverview?.contentKey,
    "approved/calendar-weekly-overview/2026-08-03",
    "The exact-copy owner-approved weekly overview must serve when its verified key shifts match."
  );
  assert.equal(
    approvedCurrentWeekOverview?.weeklyHeadline,
    "Speed gets an answer. Fairness decides whether it holds."
  );
  assert.ok(
    weekly.calendarWeeklyEventRank(currentWeekEvents[0]).finalScore
      > weekly.calendarWeeklyEventRank(currentWeekEvents[3]).finalScore,
    "A station must outrank a supporting exact aspect before chronological display ordering."
  );
  const exactOverviewRow = {
    contentKey: "authored/week-overview/test-fixture",
    surface: "weekly-overview",
    content_role: "full_copy",
    headline: "Last Quarter Moon in Taurus",
    body: "A complete owner-approved weekly overview fixture.",
    weeklyHeadline: "Last Quarter Moon in Taurus",
    weeklyOverview: "A complete owner-approved weekly overview fixture.",
    weekStart: "2026-08-03",
    weekEnd: "2026-08-09",
    mainShifts: [
      "Last Quarter Moon in Taurus",
      "Venus enters Libra",
      "Sun trine Saturn"
    ],
    mainEvent: "Last Quarter Moon in Taurus",
    review_status: "approved",
    approved_via: "owner approved test fixture"
  };
  const authoredCalendarOverview = weekly.resolveCalendarWeeklyOverview({
    weekStart: "2026-08-03",
    weekEnd: "2026-08-09",
    events: [...currentWeekEvents].reverse(),
    rows: [...rowsWithoutApprovedWeeklyOverview, exactOverviewRow]
  });
  assert.equal(authoredCalendarOverview?.source, "authored");
  assert.equal(authoredCalendarOverview?.contentSource, "owner_approved");
  assert.equal(authoredCalendarOverview?.contentKey, "authored/week-overview/test-fixture");
  assert.equal(
    authoredCalendarOverview?.weeklyHeadline,
    "Last Quarter Moon in Taurus"
  );
  assert.doesNotMatch(authoredCalendarOverview?.weeklyHeadline ?? "", /plan|schedule/iu);
  assert.deepEqual(
    authoredCalendarOverview?.mainShifts.map((event) => event.title),
    [
      "Last Quarter Moon in Taurus",
      "Venus enters Libra",
      "Sun trine Saturn"
    ],
    "Main shifts must exclude the preceding Sunday and keep in-range events chronological."
  );
  assert.equal(authoredCalendarOverview?.mainEvent?.title, "Last Quarter Moon in Taurus");
  assert.deepEqual(authoredCalendarOverview?.dateRange, {
    start: "2026-08-03",
    end: "2026-08-09"
  });
  assert.deepEqual(
    authoredCalendarOverview?.keyShiftIds,
    authoredCalendarOverview?.mainShifts.map((event) => event.id)
  );
  assert.equal(
    weekly.calendarCopySimilarity(
      "The deadline works only because one person is expected to stay late.",
      "The deadline works only because one person is expected to stay late."
    ),
    1
  );
  assert.equal(
    weekly.calendarAdjacentCopyIsDistinct(
      "Your mind may feel busier because you are trying to think your way out of what needs to be felt.",
      "Your mind might be racing because you are trying to think your way out of what you need to feel."
    ),
    false,
    "Adjacent Moon cards must reject the repeated thinking-to-avoid-feeling diagnosis."
  );
  assert.equal(
    weekly.calendarAdjacentCopyIsDistinct(
      "A deadline becomes visible. Good for review work. You're allowed to ask for time.",
      "The cost becomes visible. Good for planning. You're allowed to change the scope."
    ),
    false,
    "Adjacent Moon cards must reject identical list and permission-line closing formulas."
  );
  assert.equal(
    weekly.calendarAdjacentCopyIsDistinct(
      "Impatience is information. Check which answer is actually missing.",
      "The practical cost becomes clearer once the budget is written down."
    ),
    true
  );
  const duplicateOverviewRejected = weekly.resolveCalendarWeeklyOverview({
    weekStart: "2026-08-03",
    weekEnd: "2026-08-09",
    events: currentWeekEvents,
    dailyCopy: ["A complete owner-approved weekly overview fixture."],
    rows: [...rowsWithoutApprovedWeeklyOverview, exactOverviewRow]
  });
  assert.notEqual(
    duplicateOverviewRejected?.contentKey,
    exactOverviewRow.contentKey,
    "A weekly overview that substantially duplicates a daily card must fail closed to the reviewed fallback."
  );

  const rankedLimit = weekly.calendarWeeklyMainShifts([
    ...currentWeekEvents,
    {
      ...currentWeekEvents[3],
      id: "mercury-mars-2026-08-08",
      title: "Mercury sextile Mars",
      startsAt: "2026-08-08T12:00:00.000Z",
      dateKey: "2026-08-08",
      planets: ["Mercury", "Mars"],
      aspect: "sextile"
    },
    {
      ...currentWeekEvents[3],
      id: "venus-jupiter-2026-08-09",
      title: "Venus sextile Jupiter",
      startsAt: "2026-08-09T12:00:00.000Z",
      dateKey: "2026-08-09",
      planets: ["Venus", "Jupiter"],
      aspect: "sextile"
    },
    {
      ...currentWeekEvents[3],
      id: "moon-mercury-2026-08-09",
      title: "Moon trine Mercury",
      startsAt: "2026-08-09T18:00:00.000Z",
      dateKey: "2026-08-09",
      planets: ["Moon", "Mercury"],
      aspect: "trine"
    }
  ]);
  assert.equal(rankedLimit.length, 6, "Key shifts use the governed six-item layout maximum.");
  assert.ok(
    rankedLimit.every((event) => event.title !== "Moon trine Mercury"),
    "Ordinary Moon aspects must not displace more important weekly events."
  );
  const authoredNarrativeShifts = weekly.calendarWeeklyNarrativeShifts(
    authoredCalendarOverview?.mainShifts ?? [],
    authoredCalendarOverview?.mainEvent
  );
  assert.deepEqual(
    authoredNarrativeShifts.map((event) => event.title),
    [
      "Last Quarter Moon in Taurus",
      "Venus enters Libra",
      "Sun trine Saturn"
    ],
    "The weekly narrative keeps an opening, turning point, and later shift in chronological order."
  );
  assert.equal(
    weekly.calendarWeeklyNarrativeHeadline(
      authoredNarrativeShifts,
      authoredCalendarOverview?.weeklyHeadline ?? ""
    ),
    "Last Quarter Moon in Taurus, Venus in Libra, and Sun trine Saturn"
  );
  assert.deepEqual(
    weekly.calendarWeeklySupportingShifts(
      authoredCalendarOverview?.mainShifts ?? [],
      authoredNarrativeShifts,
      weekly.calendarWeeklyNarrativeHeadline(
        authoredNarrativeShifts,
        authoredCalendarOverview?.weeklyHeadline ?? ""
      )
    ).map((event) => event.title),
    [],
    "Events interpreted in the weekly narrative are not repeated in the supporting list."
  );

  const crowdedEclipseShifts = [
    { ...lunationEvent, id: "eclipse", title: "New Moon Solar Eclipse in Leo", eclipseType: "solar" },
    { ...stationEvent, id: "mercury-ingress", type: "ingress", title: "Mercury enters Leo" },
    { ...stationEvent, id: "mars-ingress", type: "ingress", title: "Mars enters Cancer" },
    { ...stationEvent, id: "venus-uranus", type: "aspect", title: "Venus trine Uranus" },
    { ...stationEvent, id: "mercury-uranus", type: "aspect", title: "Mercury sextile Uranus" }
  ];
  const crowdedNarrativeShifts = weekly.calendarWeeklyNarrativeShifts(
    crowdedEclipseShifts,
    crowdedEclipseShifts[0]
  );
  assert.deepEqual(crowdedNarrativeShifts.map((event) => event.title), [
    "New Moon Solar Eclipse in Leo",
    "Mercury enters Leo",
    "Mars enters Cancer"
  ]);
  const crowdedSupportingShifts = weekly.calendarWeeklySupportingShifts(
    crowdedEclipseShifts,
    crowdedNarrativeShifts,
    weekly.calendarWeeklyNarrativeHeadline(crowdedNarrativeShifts, "")
  );
  assert.deepEqual(crowdedSupportingShifts.map((event) => event.title), [
    "Venus trine Uranus"
  ]);
  assert.equal(crowdedSupportingShifts.filter((event) => event.type === "aspect").length, 1);
  const aspectOnlyNarrativeShifts = weekly.calendarWeeklyNarrativeShifts([
    { ...stationEvent, id: "mars-neptune", type: "aspect", title: "Mars square Neptune", dateKey: "2026-08-17" },
    { ...stationEvent, id: "mercury-saturn", type: "aspect", title: "Mercury trine Saturn", dateKey: "2026-08-19" },
    { ...stationEvent, id: "venus-jupiter", type: "aspect", title: "Venus sextile Jupiter", dateKey: "2026-08-21" }
  ]);
  assert.deepEqual(
    aspectOnlyNarrativeShifts.map((event) => event.title),
    ["Mars square Neptune", "Mercury trine Saturn", "Venus sextile Jupiter"],
    "Aspect-led weeks must keep three distinct reviewed events rather than stalling on a duplicated main event."
  );
  const supportingDescriptions = new Map([
    ["eclipse", "This deliberately long lunation article must stay out of the weekly overview because the compact reviewed day guidance belongs there instead of a duplicated New Moon or Full Moon feature."],
    ["mercury-ingress", "Mercury enters Leo and changes how ideas are presented, making confidence and visibility part of the message without turning every conversation into a performance for approval."],
    ["mars-ingress", "Mars enters Cancer and redirects effort toward protection, home, and the decisions that cannot be separated from who needs care or what needs defending."],
    ["venus-uranus", "Venus trine Uranus brings a third supporting paragraph."]
  ]);
  assert.equal(
    weekly.calendarWeeklyNarrativeBody({
      overview: "A compact reviewed Leo New Moon interpretation.",
      source: "generated-fallback",
      narrativeShifts: crowdedNarrativeShifts,
      eventDescriptions: supportingDescriptions,
      dayGuidance: new Map([
        ["2026-08-04", "A generic phase paragraph should not replace the sign-specific compact lunation interpretation."],
        ["2026-08-02", "A reviewed Moon-sign interpretation for this day."]
      ])
    }),
    [
      "A compact reviewed Leo New Moon interpretation.",
      "Mercury enters Leo and changes how ideas are presented, making confidence and visibility part of the message without turning every conversation into a performance for approval.",
      "Mars enters Cancer and redirects effort toward protection, home, and the decisions that cannot be separated from who needs care or what needs defending."
    ].join("\n\n"),
    "Weekly write-ups cover three chronological reviewed units and keep full lunation articles out of the overview."
  );
  assert.equal(
    weekly.calendarWeeklyNarrativeBody({
      overview: "A governed fallback opener.",
      source: "generated-fallback",
      narrativeShifts: [{
        ...lunationEvent,
        id: "quarter-moon",
        title: "First Quarter Moon in Scorpio",
        dateKey: "2026-08-19"
      }, {
        ...stationEvent,
        id: "sun-ingress",
        type: "ingress",
        title: "Sun enters Virgo",
        dateKey: "2026-08-23"
      }],
      eventDescriptions: new Map([
        ["quarter-moon", "First resistance arrives right on schedule. Adjust the plan, not the intention."],
        ["sun-ingress", "The Sun enters Virgo and shifts attention toward practical choices, useful adjustments, and work that can be improved through careful attention."]
      ]),
      dayGuidance: new Map([
        ["2026-08-19", "The Moon remains in Scorpio on Wednesday, continuing the waxing crescent phase."],
        ["2026-08-23", "The Sagittarius Moon points toward growth and a wider view."]
      ])
    }),
    [
      "First resistance arrives right on schedule. Adjust the plan, not the intention.",
      "The Sun enters Virgo and shifts attention toward practical choices, useful adjustments, and work that can be improved through careful attention."
    ].join("\n\n"),
    "A weekly event must never borrow unrelated daily Moon guidance just because its reviewed event copy is concise."
  );
  assert.equal(
    weekly.calendarWeeklyNarrativeBody({
      overview: "An exact authored weekly overview.",
      source: "authored",
      narrativeShifts: [],
      eventDescriptions: new Map(),
      dayGuidance: new Map()
    }),
    "An exact authored weekly overview.",
    "The authored overview remains the fail-closed fallback when fewer than two reviewed narrative units resolve."
  );
  assert.equal(
    weekly.calendarWeeklyNarrativeBody({
      overview: "An authored overview must not be displaced by the repeated Monday Moon paragraph.",
      source: "authored",
      mondayMoonTone: mondayAriesTone,
      narrativeShifts: [],
      eventDescriptions: supportingDescriptions,
      dayGuidance: new Map()
    }),
    "An authored overview must not be displaced by the repeated Monday Moon paragraph.",
    "The weekly write-up must preserve the authored synthesis instead of repeating Monday's day copy."
  );

  const timezoneShiftedEvents = currentWeekEvents.map((event, index) => ({
    ...event,
    dateKey: index === 0 ? "2026-08-01" : event.dateKey
  }));
  const timezoneStableOverview = weekly.resolveCalendarWeeklyOverview({
    weekStart: "2026-08-03",
    weekEnd: "2026-08-09",
    events: timezoneShiftedEvents,
    rows: [...rowsWithoutApprovedWeeklyOverview, exactOverviewRow]
  });
  assert.equal(
    timezoneStableOverview?.contentKey,
    "authored/week-overview/test-fixture",
    "A location-derived dateKey change must not rewrite engine event names or bypass valid authored copy."
  );

  const crossMonthFallback = weekly.resolveCalendarWeeklyOverview({
    weekStart: "2026-07-26",
    weekEnd: "2026-08-01",
    events: [stationEvent],
    rows
  });
  assert.equal(crossMonthFallback?.source, "generated-fallback");
  assert.equal(crossMonthFallback?.contentSource, "owner_authored");
  assert.equal(crossMonthFallback?.contentKey, "authored/week-opener/station");
  assert.match(crossMonthFallback?.weeklyHeadline ?? "", /Mercury stations retrograde in Leo/u);
  assert.doesNotMatch(crossMonthFallback?.weeklyHeadline ?? "", /plan|schedule/iu);
  assert.match(crossMonthFallback?.weeklyOverview ?? "", /A planet changes direction/iu);
  assert.equal(crossMonthFallback?.provenance.reviewStatus, "approved");
  assert.deepEqual(crossMonthFallback?.mainShifts.map((event) => event.title), [
    "Mercury stations retrograde"
  ]);

  const youPage = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx"), "utf8");
  const app = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
  const weeklySource = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/services/weeklyHoroscope.ts"),
    "utf8"
  );
  assert.match(youPage, /\{ value: "daily", label: "Daily" \}/u);
  assert.match(youPage, /\{ value: "weekly", label: "Weekly" \}/u);
  assert.doesNotMatch(youPage, /weeklyHoroscopeAssembly\.cards\.map/u);
  assert.doesNotMatch(youPage, /weeklyHoroscopeAssembly\.sections\.map/u);
  assert.doesNotMatch(youPage, /weekly-horoscope__background/u);
  assert.match(youPage, /weekly-horoscope__reading daily-horoscope-summary/u);
  assert.match(youPage, /weekly-horoscope__macro daily-horoscope-summary/u);
  assert.match(youPage, /weekly-horoscope__aspect daily-horoscope-summary/u);
  assert.match(youPage, />The macro view</u);
  assert.match(youPage, />Aspect</u);
  assert.match(youPage, />Your horoscope</u);
  assert.match(youPage, /Based on \{weeklyHoroscopeAssembly\.horoscope\.driverLabel\}/u);
  assert.match(app, /buildWeeklyHoroscope\(\{/u);
  assert.match(weeklySource, /getLunarCalendarRangeEvents/u);
  assert.match(weeklySource, /weeklyEphemerisCache/u);
  assert.doesNotMatch(
    weeklySource,
    /getLunarCalendarMonth/u,
    "Weekly assembly must not calculate the 42-day visual calendar."
  );
  assert.match(
    weeklySource,
    /includeTransitWindows/u,
    "Weekly snapshots must request governed station timing windows for house-specific station copy."
  );
  assert.match(
    weeklySource,
    /aquarius:\s*"saturn"/u,
    "Aquarius lunations must use Saturn as the default ruler."
  );
  assert.match(
    weeklySource,
    /scorpio:\s*"mars"/u,
    "Scorpio lunations must use Mars as the default ruler."
  );
  assert.match(
    weeklySource,
    /pisces:\s*"jupiter"/u,
    "Pisces lunations must use Jupiter as the default ruler."
  );
  assert.doesNotMatch(
    weeklySource,
    /(?:aquarius:\s*"uranus"|scorpio:\s*"pluto"|pisces:\s*"neptune")/u,
    "Modern planets must never enter the default lunation ruler canon."
  );

  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const location = {
    label: "New York City, NY",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York"
  };
  const jul29Events = await ephemeris.getLunarCalendarRangeEvents(
    location,
    new Date("2026-07-29T00:00:00Z"),
    new Date("2026-07-30T00:00:00Z")
  );
  const aquariusFullMoonEvent = jul29Events.find((event) => (
    event.type === "lunation"
    && event.title.includes("Full Moon")
    && event.sign === "Aquarius"
  ));
  assert.ok(aquariusFullMoonEvent, "The Jul 29 Aquarius Full Moon event must resolve.");
  const eventSky = await ephemeris.getAstrodienstSky(
    location,
    new Date(aquariusFullMoonEvent.startsAt)
  );
  const eventPosition = (planet) => eventSky.positions.find(
    (position) => position.planet.toLowerCase() === planet
  );
  const eventSun = eventPosition("sun");
  const eventJupiter = eventPosition("jupiter");
  const eventSaturn = eventPosition("saturn");
  const eventUranus = eventPosition("uranus");
  assert.equal(eventSaturn?.sign, "Aries");
  assert.equal(eventSaturn?.motion, "retrograde");
  assert.equal(eventUranus?.sign, "Gemini");
  assert.equal(eventJupiter?.sign, "Leo");
  assert.equal(eventSun?.sign, "Leo");
  assert.ok(
    typeof eventSun?.longitude === "number"
    && typeof eventJupiter?.longitude === "number"
    && Math.min(
      Math.abs(eventSun.longitude - eventJupiter.longitude),
      360 - Math.abs(eventSun.longitude - eventJupiter.longitude)
    ) <= 3,
    "The event-time sky must preserve the Sun-Jupiter conjunction in Leo."
  );
  const geminiBlendFacts = weekly.lunationBlendFacts(
    eventSky,
    "Aquarius",
    "gemini",
    "full-moon"
  );
  assert.equal(geminiBlendFacts.ruler, "saturn");
  assert.equal(geminiBlendFacts.rulerHouse, 11);
  assert.equal(geminiBlendFacts.rulerRetrograde, true);
  assert.equal(geminiBlendFacts.uranusHouse, 1);
  assert.doesNotThrow(() => weekly.assertLunationBodyMatchesEventSky(
    "Saturn is currently retrograde in Aries, Uranus is in Gemini, and Jupiter conjunct the Sun in Leo.",
    eventSky
  ));
  assert.throws(
    () => weekly.assertLunationBodyMatchesEventSky("Saturn Rx in Pisces.", eventSky),
    /SOURCE_GAP: stale-sky lunation claim/u
  );

  const natalSky = await ephemeris.getAstrodienstSky(location, new Date("1990-01-01T12:00:00Z"));
  const realWeek = await weekly.buildWeeklyHoroscope({
    userId: "weekly-acceptance-fixture",
    natalSky,
    risingSign: "gemini",
    location,
    now: new Date("2026-07-29T12:00:00Z")
  });
  assert.equal(realWeek.weekStart, "2026-07-27");
  assert.equal(realWeek.weekEnd, "2026-08-02");
  assert.equal(realWeek.weekType, "lunation");
  assert.equal(realWeek.macro?.headline, "The Macro View: What the Aquarius Full Moon Represents");
  assert.match(realWeek.macro?.body ?? "", /^Full Moons bring what has been building/u);
  assert.ok(realWeek.horoscope.headline.trim().length > 0);
  assert.notEqual(realWeek.horoscope.headline, "Full Moon week");
  assert.match(realWeek.horoscope.driverLabel, /Full Moon in Aquarius/u);
  assert.ok(realWeek.horoscope.body.trim().length > 0);
  assert.equal(realWeek.horoscope.sourceUnits.length, 1);
  assert.match(realWeek.horoscope.body, /9th house/u);
  assert.match(realWeek.horoscope.body, /3rd house/u);
  assert.match(
    realWeek.horoscope.body,
    /Saturn rules this Full Moon from your 11th house, so friends, organizations, professional contacts, and shared commitments are part of the answer\./u
  );
  assert.match(
    realWeek.horoscope.body,
    /Because Saturn is retrograde, this is less about taking on something new and more an inspection of what already exists:/u
  );
  assert.match(
    realWeek.horoscope.body,
    /Uranus in your 1st house adds a more personal element of change/u
  );
  assert.match(
    realWeek.horoscope.body,
    /An Aquarius Full Moon shows you how the arrangement actually works/u
  );
  assert.match(
    realWeek.horoscope.body,
    /This week, the missing information arrives, someone gives their answer, or the practical cost of the plan becomes harder to ignore\./u
  );
  assert.doesNotMatch(
    realWeek.horoscope.body,
    /\b(?:It can show up|That might look|Let go of|Your higher path|Set your intention)\b/u,
    "The retired per-rising closer stack must not render in the weekly centerpiece."
  );
  assert.ok(Array.isArray(realWeek.aspects));
  const readerText = [
    realWeek.horoscope.headline,
    realWeek.horoscope.driverLabel,
    realWeek.horoscope.body
  ].join("\n");
  assert.doesNotMatch(readerText, /SOURCE_GAP/u);
  assert.doesNotMatch(readerText, /\btoday\b/iu, "Weekly copy must not read like a daily horoscope.");
  assert.ok(
    realWeek.horoscope.sourceUnits.every((unit) => !unit.startsWith("station:retrograde-")),
    "An ongoing retrograde passage must not be treated as a station-day override."
  );
  assert.doesNotMatch(readerText, /remains retrograde/u);
  assert.doesNotThrow(
    () => weekly.assertLunationBodyMatchesEventSky(realWeek.horoscope.body, eventSky),
    "Every explicit planet-sign claim in the per-rising lunation must match the event-time ephemeris."
  );
  assert.doesNotMatch(
    readerText,
    /\b(?:Saturn(?: Rx)? in Pisces|Uranus in Taurus|Jupiter in Cancer)\b/u,
    "Retired sky positions must never leak into the Jul 29 per-rising card."
  );

  const quarterMoonWeek = await weekly.buildWeeklyHoroscope({
    userId: "weekly-quarter-moon-fixture",
    natalSky,
    risingSign: "gemini",
    location,
    now: new Date("2026-08-03T16:00:00Z")
  });
  assert.equal(quarterMoonWeek.weekStart, "2026-08-03");
  assert.equal(quarterMoonWeek.weekEnd, "2026-08-09");
  assert.notEqual(
    quarterMoonWeek.weekType,
    "lunation",
    "A quarter Moon must not classify the personal write-up as a New/Full Moon week."
  );
  assert.equal(
    quarterMoonWeek.macro,
    undefined,
    "A quarter Moon must not select a Full Moon macro article."
  );
  assert.doesNotMatch(
    [
      quarterMoonWeek.horoscope.headline,
      quarterMoonWeek.horoscope.driverLabel,
      quarterMoonWeek.horoscope.body
    ].join("\n"),
    /Taurus Full Moon|Full Moon in Taurus/iu,
    "The Aug 3-9 write-up must not relabel the Last Quarter Moon in Taurus as a Full Moon."
  );
  assert.match(
    quarterMoonWeek.horoscope.headline,
    /Weekly Moon: Aries/u,
    "The Monday-Sunday fixture must not pull the preceding Sunday's Chiron station into the week."
  );
  assert.doesNotMatch(
    [
      quarterMoonWeek.horoscope.headline,
      quarterMoonWeek.horoscope.driverLabel,
      quarterMoonWeek.horoscope.body
    ].join("\n"),
    /Chiron stations retrograde/u,
    "A station outside the local Monday-Sunday boundary must stay outside the weekly reading."
  );
  assert.match(
    personalizedChironStation.headline,
    /Chiron stations retrograde in your 12th house/u,
    "The station headline must name the house calculated from the event sign and rising sign."
  );
  assert.match(
    personalizedChironStation.body,
    /Chiron in your 12th house brings quiet grief/u,
    "The station write-up must include the approved personalized transit-house layer."
  );

  const mondaySky = await ephemeris.getAstrodienstSky(
    location,
    new Date("2026-07-27T16:00:00Z")
  );
  const mondaySaturn = mondaySky.positions.find((position) => position.planet === "Saturn");
  assert.ok(mondaySaturn && typeof mondaySaturn.longitude === "number");
  const forcedSaturnVenusNatal = {
    ...natalSky,
    positions: natalSky.positions.map((position) => (
      position.planet === "Venus"
        ? { ...position, longitude: (mondaySaturn.longitude + 90) % 360 }
        : position
    ))
  };
  const separatedAspectWeek = await weekly.buildWeeklyHoroscope({
    userId: "weekly-separated-aspect-fixture",
    natalSky: forcedSaturnVenusNatal,
    risingSign: "gemini",
    location,
    now: new Date("2026-07-29T12:00:00Z")
  });
  const saturnVenusAspect = separatedAspectWeek.aspects.find((aspect) => (
    /Saturn square your Venus/iu.test(aspect.driverLabel)
  ));
  assert.ok(saturnVenusAspect, "The supporting Saturn-Venus aspect must remain available.");
  assert.doesNotMatch(
    separatedAspectWeek.horoscope.body,
    /You may feel lonely even next to people who love you/u,
    "Aspect copy must not be appended to the lunation horoscope."
  );
  assert.match(
    saturnVenusAspect.body,
    /You may feel lonely even next to people who love you/u,
    "Aspect copy must render in its own standalone card."
  );

  console.log("weekly horoscope assembly checks passed: event-time ruler condition, stale-sky guard, macro, and standalone aspect cards");
} finally {
  await vite.close();
}
