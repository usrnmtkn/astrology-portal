import { requestSkyPlacementArticleSnapshot, prepareSkyPlacementArticleContent, loadContentRegistry, skyDetailFromRoutePath } from '../../App';
import type { GeneratedContentMap } from '../../App';
import type { LocationInput } from '../../types';
import { validateAstrologyFacts } from '../../services/astrologyFacts';
import { refreshContentPublications, contentPublicationsAvailableOnline } from '../../services/contentPublications';
import { prepareSkyPlacementSources } from '../../services/skyPlacementHydration';
import { installSkyCoreFallbackArchitectureV3Bundle, installSkyPlacementFallbackArchitectureV3Bundle } from '../../content/fallbackArchitectureV3Runtime';
import { eligibleSkyDetailContent } from '../../services/skyDetailContent';
import { loadLiveGeneratedContentForKeys } from '../../services/generatedContent';
import { getAstrodienstSkyOffMainThread } from '../../services/skyCalculationClient';
import { skyDateTimeFromInput } from '../../services/skySelection';
import { withTimeZone } from '../../services/timezones';
import { skyNodeDisplayPositions } from './skyHelpers';
import { skyIngressEssayPublicationKeys } from '../../content/skyIngressEssayReader';
import { contentPublicationRecords } from '../../content/contentPublicationState';
import { skyPreviewReferenceDate } from '../../../../../src/shared/skyReaderPreview';

/** The isolated Studio page uses the same facts, admitted sources and article builder as Sky. */
export async function prepareStudioSkyPlacementReader(input: { planet: string; sign: string; date: string; location: LocationInput }) {
  await refreshContentPublications(true);
  if (!contentPublicationsAvailableOnline()) throw new Error('Current Sky publication state could not be verified. Retry the preview.');
  const location = withTimeZone(input.location);
  const reference = skyDateTimeFromInput(input.date, location, true);
  const sky = await getAstrodienstSkyOffMainThread(location, reference, { includeDailyEvents: false, includeTransitWindows: false });
  const position = skyNodeDisplayPositions(sky.positions).find(candidate => candidate.planet.toLowerCase().replaceAll(' ', '-') === input.planet);
  if (!position) throw new Error('This planet or point is not available on the selected date.');
  const sign = position.sign.toLowerCase();
  const [prepared, sources, baseline] = await Promise.all([
    prepareSkyPlacementArticleContent(requestSkyPlacementArticleSnapshot(location, input.planet, sign, input.date, reference),
      input.planet, sign, new Map(), () => undefined),
    prepareSkyPlacementSources(`article:${input.planet}/${sign}`),
    // Keep the selected article's public baseline available for revision checks,
    // even when the planet occupies another sign on the preview date.
    sign === input.sign ? new Map() : loadLiveGeneratedContentForKeys(skyIngressEssayPublicationKeys(contentPublicationRecords(), input)),
    loadContentRegistry('sky')
  ]);
  installSkyCoreFallbackArchitectureV3Bundle(sources.coreBundle);
  installSkyPlacementFallbackArchitectureV3Bundle(sources.placementBundle);
  const { placementSky } = prepared;
  if (!validateAstrologyFacts(placementSky.facts ?? []).ok) throw new Error('The selected placement calculation could not be verified.');
  const timeZone = placementSky.location.timeZone || 'UTC';
  if (skyPreviewReferenceDate(placementSky.generatedAt, timeZone) !== input.date) throw new Error('The reader calculation moved outside the selected date. Refresh the preview.');
  const content = eligibleSkyDetailContent(new Map([...baseline, ...prepared.content]));
  return { content, instant: placementSky.generatedAt, timeZone, placement: { planet: position.planet, sign: position.sign, signKey: sign },
    render: async (rows: GeneratedContentMap) => {
      const detail = skyDetailFromRoutePath(`sky/placement/${input.planet}/${sign}`, placementSky, rows);
      if (!detail) throw new Error('This placement is not available on the selected date. Choose a date in its residency.');
      if (detail.placementResidencyContext) {
        const { skyPlacementResidencyAspectSections } = await import('../../services/skyPlacementResidencyAspects');
        const { sections } = await skyPlacementResidencyAspectSections(detail.placementResidencyContext);
        detail.sections = [...sections, ...(detail.sections ?? [])];
        detail.placementResidencyContext = undefined;
      }
      if (detail.readerExport) {
        const source = detail.readerExport;
        const missing = source.keys.filter(key => key.includes('/') && !source.rows.some(row => row.contentKey === key));
        if (missing.length) {
          const versions = eligibleSkyDetailContent(await loadLiveGeneratedContentForKeys(missing));
          source.rows = [...source.rows, ...[...versions.values()].filter(row => source.keys.includes(row.contentKey))];
        }
      }
      return detail;
    }
  };
}
