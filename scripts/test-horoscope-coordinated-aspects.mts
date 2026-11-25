import assert from 'node:assert/strict';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {horoscopeAspectFindings} from '../src/astro-writing/horoscopeAspectClaims.mjs';

process.env.SUPABASE_SERVICE_ROLE_KEY='coordinated-aspect-fixture-only';
const {brief}=await prepareHoroscopeBrief(new URL('http://localhost/?period=weekly&date=2026-11-16&timeZone=America/New_York'));
for(const text of [
 'On Wednesday, the Sun squares Jupiter, then squares Mars on Thursday.',
 'The Sun in Scorpio in your 8th house of intimacy and trust squares Jupiter, then squares Mars.',
 'The Sun squares Jupiter and squares Mars.',
 'The Sun squares Jupiter and then squares Mars.',
 'The Sun squares Jupiter on Wednesday, then squares Mars on Thursday.',
 'The Sun squares Jupiter on Wednesday and Mars on Thursday.',
 'The Sun squares Jupiter and Mars.',
 'The Sun in Scorpio in your 5th house of creativity, dating, and play squares Jupiter on Wednesday, then squares Mars on Thursday.',
 'Mars meets Jupiter. The Sun squares Jupiter, then squares Mars.',
 'Mars, your ruling planet, joins Jupiter in Leo in your 5th house on Monday.',
 'On Wednesday, the Sun in Scorpio in your 8th house squares Jupiter. On Thursday, it squares Mars.',
 'The Sun in Scorpio in your 8th house of shared reserves and business agreements with several people squares Jupiter.',
 'The Sun in Scorpio in your 8th house of joint funds with relatives squares Jupiter, then squares Mars.',
 'The Sun in Scorpio in your 8th house of money shared with others squares Jupiter. The Sun squares Mars.',
 'As the Sun in Scorpio moves through your 8th house of intimacy, it squares Jupiter on Wednesday and Mars on Thursday.',
 'As the Sun in Scorpio moves through your 8th house of intimacy and trust, it squares Jupiter on Wednesday and squares Mars on Thursday.',
])assert.deepEqual(horoscopeAspectFindings(text,brief),[],text);
for(const text of [
 'The Sun squares Jupiter, then trines Mars.',
 'The Sun squares Jupiter, then squares Neptune.',
 'Mars joins Neptune on Monday.',
 'On Wednesday, the Sun squares Jupiter. On Friday, it squares Mars.',
 'On Tuesday, the Sun squares Jupiter. On Thursday, it squares Mars.',
 'On Wednesday, the Sun squares Jupiter. On Thursday, it trines Mars.',
 'On Wednesday, the Sun squares Jupiter. On Thursday, it squares Neptune.',
 'On Wednesday, the Sun squares Jupiter.\n\nOn Thursday, it squares Mars.',
 'On Wednesday, the Sun squares Jupiter. Venus changes sign. On Thursday, it squares Mars.',
 'On Wednesday, the Sun squares Jupiter and Venus. On Thursday, it squares Mars.',
 'The Sun squares Jupiter. Then squares Mars.',
 'The Sun squares Jupiter, then it squares Mars.',
 'The Sun squares Jupiter, then Saturn squares Mars.',
 'The Sun squares Jupiter while Venus changes direction, then squares Mars.',
 'The Sun squares Jupiter, then squares Mars and opposes Venus.',
 'The Sun squares Jupiter and Mars sextiles Venus.',
 'The Sun in your 5th house of creativity, Neptune squares Jupiter, then squares Mars.',
 'The Sun in Scorpio in your 8th house of joint funds with relatives trines Mars.',
 'The Sun in Scorpio in your 8th house of joint funds with relatives squares Neptune.',
 'The Sun in Scorpio in your 8th house of funds with Neptune squares Jupiter.',
 'The Sun in Scorpio in your 8th house of funds with the retrograde Neptune squares Jupiter.',
 'As the Sun in Scorpio moves through your 8th house of intimacy, it trines Jupiter.',
 'As the Sun in Scorpio moves through your 8th house of intimacy, it squares Neptune.',
 'As the Sun and Mercury move through your 8th house of intimacy, it squares Jupiter.',
 'As the Sun in Scorpio moves through your 8th house of funds with Neptune, it squares Jupiter.',
 'As the Sun in Scorpio moves through your 8th house of intimacy while Venus changes direction, it squares Jupiter.',
 'The Sun in Scorpio moves through your 8th house of intimacy. It squares Jupiter.',
])assert(horoscopeAspectFindings(text,brief).length,text);
const noSecond={...brief,relationalContext:undefined,events:brief.events.filter((e:any)=>!(e.type==='aspect'&&e.aspect==='square'&&e.planets.includes('Mars')))};
assert(horoscopeAspectFindings('The Sun squares Jupiter, then squares Mars.',noSecond).length,'Every resolved pair still needs its own calculated event');
assert(horoscopeAspectFindings('As the Sun in Scorpio moves through your 8th house of intimacy, it squares Jupiter on Wednesday and Mars on Thursday.',noSecond).length,'The bounded introductory subject still checks both claimed pairs');
assert.deepEqual(horoscopeAspectFindings('You meet friends and meet a deadline.',brief),[]);
assert.deepEqual(horoscopeAspectFindings('You join friends and join a class.',brief),[]);
assert.deepEqual(horoscopeAspectFindings('The Sun and Moon join forces.',brief),[],'Ordinary paired personification is not a named conjunction claim');
const noMeeting={...brief,relationalContext:undefined,events:brief.events.filter((event:any)=>!(event.type==='aspect'&&event.aspect==='conjunction'))};
assert(horoscopeAspectFindings('Mars joins Jupiter on Monday.',noMeeting).length,'A natural conjunction verb must still be checked against the actual calculation');
console.log('PASS coordinated aspect predicates: real calculated week, ordinary bounded life-area glosses, explicit subject inheritance, unchanged reader text, each pair checked, unsupported/ambiguous/cross-sentence claims rejected. No provider calls.');
