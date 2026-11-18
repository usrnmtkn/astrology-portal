import {placementVisitWindow} from "../../services/placementCardTiming";
import {isDisplayRetrograde} from "../../services/astrologyDisplay";
import type {PlanetPosition} from '../../types';
import {HOROSCOPE_SIGNS} from '../../content/horoscopeEditions.mjs';
import {transitSynastryFallbackRendererV3,SourceGapError} from '../../content/fallbackArchitectureV3Runtime';
import {isReaderFacingCopy} from '../../content/readerSafety';
import {skyIngressEssayReaderSection} from '../../content/skyIngressEssayReader';
import {contentPublication} from '../../content/contentPublicationState';
import type {LiveGeneratedContent} from '../../services/generatedContent';
import {assertCompiledSkyArticleEdition} from '../../content/skyArticleTemplateCompiler';

export const planetarySlug=(value:string)=>value.toLowerCase().replaceAll(' ','-');
export const planetaryHouse=(position:PlanetPosition,sign:string)=>(HOROSCOPE_SIGNS.indexOf(position.sign.toLowerCase())-HOROSCOPE_SIGNS.indexOf(sign.toLowerCase())+12)%12+1;

export function planetaryHoroscopeBody(position:PlanetPosition,sign:string) {
  try {
    const body=transitSynastryFallbackRendererV3.renderSkyPlacementHouseCore({planet:planetarySlug(position.planet),sign:planetarySlug(position.sign),house:planetaryHouse(position,sign)}).body;
    return isReaderFacingCopy(body)?body:'';
  } catch(reason) {
    if(reason instanceof SourceGapError)return '';
    throw reason;
  }
}

export function planetaryHoroscopeWindow(position:PlanetPosition,generatedAt:string) {
  const station=isDisplayRetrograde(position)&&position.retrogradeWindowSource==='station';
  const visit=placementVisitWindow(position,generatedAt);
  const start=Date.parse((station?position.retrogradeStart:visit?.start.toISOString())??'');
  const end=Date.parse((station?position.retrogradeEnd:visit?.end.toISOString())??'');
  return Number.isFinite(start)&&Number.isFinite(end)&&start<end?{start:new Date(start),end:new Date(end)}:null;
}

export function planetaryHoroscopeReading(position:PlanetPosition,sign:string,generatedAt:string,rows:LiveGeneratedContent[]) {
  const house=planetaryHouse(position,sign);
  const candidates=rows.filter(row=>{
    try {
      const edition=assertCompiledSkyArticleEdition((row.sections as {skyArticleEdition?:unknown})?.skyArticleEdition);
      return edition.writeupHoroscopes?edition.writeupHoroscopes.some(p=>p.sign===sign.toLowerCase()&&p.body.trim())
        :edition.housePassages.some(p=>(p.risingSign?.toLowerCase()===sign.toLowerCase()||!p.risingSign&&p.house===house)&&typeof p.body==='string'&&p.body.trim());
    } catch { return false; }
  });
  const article=skyIngressEssayReaderSection(candidates,{
    activeInstant:generatedAt,planet:planetarySlug(position.planet),sign:planetarySlug(position.sign)
  },contentPublication);
  const passage=article?.risingHoroscopes.find(p=>p.risingSign?.toLowerCase()===sign.toLowerCase()||!p.risingSign&&p.house===house);
  return passage&&isReaderFacingCopy(passage.body)
    ? {body:passage.body,window:article!.articlePeriod?{start:new Date(article!.articlePeriod.startsAt),end:new Date(article!.articlePeriod.endsAt)}:planetaryHoroscopeWindow(position,generatedAt)}
    : {body:planetaryHoroscopeBody(position,sign),window:planetaryHoroscopeWindow(position,generatedAt)};
}

