import assert from 'node:assert/strict';
import {skyPlacementSourceFixture} from '../tests/helpers/sky-placement-source-fixture.mts';
import {compileSkyArticleEdition,reviseSkyArticleEdition,skyArticleEditableFields} from '../apps/web/src/content/skyArticleTemplateCompiler';
import {WRITEUP_HOROSCOPE_SIGNS} from '../src/shared/skyWriteupHoroscopes';
import {installContentPublications} from '../apps/web/src/content/contentPublicationState';
import {loadSkyPlacementFallbackArchitectureV3Bundle} from '../apps/web/src/content/fallbackArchitectureV3Runtime';
import {planetaryHoroscopeReading,planetaryHoroscopeBody} from '../apps/web/src/features/horoscopes/planetaryHoroscopeReading';
import type {PlanetPosition} from '../apps/web/src/types';
import type {LiveGeneratedContent} from '../apps/web/src/services/generatedContent';

const fixture=await skyPlacementSourceFixture('mercury','scorpio');
const readings=WRITEUP_HOROSCOPE_SIGNS.map(sign=>({sign,body:`Synthetic ${sign} opening.\n\nSynthetic ${sign} complete final sentence.`}));
const edition=await reviseSkyArticleEdition(fixture.edition,{...skyArticleEditableFields(fixture.edition),writeupHoroscopes:readings});
const row={id:fixture.active.id,contentKey:edition.contentKey,status:'LIVE',lane:'serving',reviewState:null,
 headline:edition.headline,summary:edition.tldr,body:edition.body,sections:{skyArticleEdition:edition},updatedAt:fixture.active.updated_at,
 sourceSnapshot:{ownerApproval:{approved:true,action:'approve-sky-article-edition',contentKey:edition.contentKey,templateKey:edition.templateKey,templateHash:edition.templateHash,fixedProseHash:edition.fixedProseHash,compiledHash:edition.compiledHash}}} as LiveGeneratedContent;
const publication={content_key:row.contentKey,state:'live',revision:1,row_id:row.id,row_updated_at:row.updatedAt,updated_at:row.updatedAt};
installContentPublications([publication]);await loadSkyPlacementFallbackArchitectureV3Bundle();
const position={planet:'Mercury',sign:'Scorpio',retrograde:true} as PlanetPosition;
const fallback=planetaryHoroscopeBody(position,'gemini');assert(fallback.trim());
for(const sign of WRITEUP_HOROSCOPE_SIGNS){const reading=planetaryHoroscopeReading(position,sign,edition.transitStartInstant,[row]);assert.equal(reading.body,readings.find(p=>p.sign===sign)!.body);assert.equal(reading.window?.end.getTime(),Date.parse(edition.transitEndInstant));}
assert.equal(planetaryHoroscopeReading(position,'Gemini',edition.transitStartInstant,[row]).body,readings[2].body);
assert.equal(planetaryHoroscopeReading(position,'gemini',new Date(Date.parse(edition.transitStartInstant)-1).toISOString(),[row]).body,fallback,'A future write-up cannot serve early.');
const bodyOnly=await compileSkyArticleEdition({...fixture.edition,templateBody:'',validFrom:'2026-09-23',transitStartInstant:'2026-09-23T00:00:00Z'});
const bodyOnlyRow={...row,id:'body-only',contentKey:bodyOnly.contentKey,headline:bodyOnly.headline,summary:bodyOnly.tldr,body:bodyOnly.body,sections:{skyArticleEdition:bodyOnly},sourceSnapshot:{ownerApproval:{...row.sourceSnapshot!.ownerApproval as object,contentKey:bodyOnly.contentKey,compiledHash:bodyOnly.compiledHash}}};
installContentPublications([publication,{...publication,content_key:bodyOnly.contentKey,row_id:bodyOnlyRow.id}]);
assert.equal(planetaryHoroscopeReading(position,'gemini','2026-09-24T00:00:00Z',[bodyOnlyRow,row]).body,readings[2].body,'A newer article without sign readings must not hide the matching published horoscope.');
installContentPublications([publication]);
assert.equal(planetaryHoroscopeReading(position,'gemini',edition.transitStartInstant,[{...row,sections:{skyArticleEdition:{...edition,writeupHoroscopes:{}}}} as LiveGeneratedContent]).body,fallback,'Malformed reader rows cannot crash the planetary surface.');
assert.equal(planetaryHoroscopeReading(position,'gemini',edition.transitEndInstant,[row]).body,fallback,'An ended write-up does not leak into the next period.');
assert.equal(planetaryHoroscopeReading(position,'gemini',edition.transitStartInstant,[{...row,status:'DRAFT'}]).body,fallback,'AI or manual drafts remain private.');
assert.equal(planetaryHoroscopeReading(position,'gemini',edition.transitStartInstant,[{...row,updatedAt:'2000-01-01T00:00:00Z'}]).body,fallback,'A stale publication version cannot supply prose.');
installContentPublications([{...publication,state:'retired',revision:2}]);
assert.equal(planetaryHoroscopeReading(position,'gemini',edition.transitStartInstant,[row]).body,fallback,'Retirement removes the published reading.');
console.log('PASS: all twelve published sign readings and exact periods reach planetary readers; private, ended, stale and retired sources do not replace evergreen fallback.');
