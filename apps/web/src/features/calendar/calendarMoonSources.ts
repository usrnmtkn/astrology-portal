import { fallbackV3HookBody, SourceGapError, transitSynastryFallbackRendererV3 } from '../../content/fallbackArchitectureV3Runtime';
import { resolveLunationReaderSource } from '../../content/lunationReaderSource';
import { createCalendarMoonSources } from './calendarMoonSourcesCore';

export const calendarMoonSources = createCalendarMoonSources({
  hookBody: fallbackV3HookBody,
  lunation: resolveLunationReaderSource,
  weeklyMoon: (sign, variant) => {
    try { return transitSynastryFallbackRendererV3.renderWeeklyMoon({ sign, variant }); }
    catch (error) { if (!(error instanceof SourceGapError)) throw error; return null; }
  }
});
export const { calendarLiveBody, calendarWeeklyMoonAuthoredPassages, calendarMoonFallbackOptions,
  calendarMoonResolvedWeekly, calendarMoonResolvedByDate, packagedWeeklyMoon, moonWritingForDay,
  calendarMoonCycleFallbackPiece } = calendarMoonSources;
