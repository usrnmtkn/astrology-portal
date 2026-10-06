import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Calibration material only: never REGISTER evidence, serving copy or approvals.
// Exact small examples and scoped expectations supplied by the owner on 2026-10-06.
const source = 'owner-request:2026-10-06:rhetorical-pattern-protections';
export const rhetoricalCases = [
  {id:'schedule-reframe',surface:'weekly',body:"This isn't really about the schedule. It's about what the schedule represents.",required:['CORRECTIO']},
  {id:'fear-upgrade',surface:'personal-transits',body:'You are frustrated — or rather, afraid nothing will change.',required:['CORRECTIO']},
  {id:'decorative-symbols',surface:'natal',body:'the remembered detail, the reliable gesture, the good thing chosen to last',required:['TRICOLON','PURPLE_PROSE']},
  {id:'command-triple',surface:'daily',body:'Pause, listen, and trust yourself.',required:['TRICOLON','GENERIC_ADVICE']},
  {id:'momentum',surface:'sky',body:'Use the restless momentum.',anyOf:['PURPLE_PROSE','POLISHED_ASTROLOGY_PROSE']},
  {id:'strategy-race',surface:'calendar',body:'Uncertainty can outrun your strategy.',required:['PURPLE_PROSE']},
  {id:'consequential-contrast',surface:'seasonal',body:'You may want to answer immediately, but waiting until you know what you actually think could save you from reopening the conversation tomorrow.',forbidden:['CORRECTIO']},
  {id:'two-costs',surface:'you-friend',body:'You may agree to the favor, then realize it takes more time or money than you wanted to give.',forbidden:['TRICOLON']}
].map(f=>({...f,source,authority:'owner_supplied_calibration',unit:'exact supplied example'}));

// Explicitly synthetic connected-body controls, not owner-authored examples.
rhetoricalCases.push(
  {id:'natal-symbolic-body',surface:'natal',source,authority:'synthetic_context_for_owner_failure',
    body:'Your Venus in Taurus trusts the remembered detail, the reliable gesture, and the thing chosen to last. These are the signs that someone cares.',required:['TRICOLON','PURPLE_PROSE']},
  {id:'required-chart-data',surface:'natal',source,authority:'synthetic_factual_control',
    body:'The chart form needs your birth date, time, and place. The date identifies the day. The time locates the moment within it, and the place establishes the local horizon. Leaving out any one prevents the form from calculating the requested complete chart.',forbidden:['TRICOLON']},
  {id:'necessary-time-precision',surface:'calendar',source,authority:'synthetic_precision_control',
    body:'The calendar uses your local time — or more accurately, the time zone selected in the calendar settings. If that setting differs from where you are, an event near midnight may appear on a different date.',forbidden:['CORRECTIO']},
  {id:'late-body-decoration',surface:'moon-sign-ingress',source,authority:'synthetic_connected_body_failure',
    body:'You may say yes before checking how long the visit will take. When you see the travel time, you realize you cannot stay for the whole afternoon.\n\nUncertainty can outrun your strategy.',required:['PURPLE_PROSE']}
);

const ownerPath = 'packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/reference-surfaces/libra-season-autumn-equinox.md';
const ownerBody = fs.readFileSync(new URL(`../../../${ownerPath}`, import.meta.url),'utf8');
rhetoricalCases.push({id:'owner-contrast-and-image',surface:'seasonal',source:ownerPath,
  sha256:createHash('sha256').update(ownerBody).digest('hex'),authority:'existing_owner_passage_scoped_controls',
  body:ownerBody,protectedSpans:[
    {text:'Not in defeat, but in strategy.',labels:['CORRECTIO']},
    {text:"Scales that never tip aren't balanced - they're broken.",labels:['PURPLE_PROSE']}
  ]});

export const rhetoricalSurfaceSets = Object.fromEntries([...new Set(rhetoricalCases.map(f=>f.surface))]
  .map(surface=>[surface,rhetoricalCases.filter(f=>f.surface===surface).map(f=>f.id)]));
