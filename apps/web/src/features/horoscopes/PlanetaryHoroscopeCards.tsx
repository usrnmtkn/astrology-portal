import {useMinimumLoading} from "../../hooks/useMinimumLoading";
import type {PlanetPosition,SkySnapshot} from '../../types';
import {PlanetPlacementRow,ordinalHouse} from '../../components/charts/PlacementRows';
import {ContentLoading as PageLoading} from '../../components/LoadingPatterns';
import {PageLoadState} from '../../components/PageLoading';
import {formatPlanetDegree} from '../sky/skyHelpers';
import {planetaryHoroscopeBody,planetaryHoroscopeWindow,planetaryHouse,usePlanetaryHoroscopeSources} from './usePlanetaryHoroscopeSources';

export default function PlanetaryHoroscopeCards({sky,sign,href}:{sky:SkySnapshot;sign:string;href:(position:PlanetPosition)=>string}) {
  const {ready,error,refresh}=usePlanetaryHoroscopeSources();
  const holding=useMinimumLoading(!ready);
  return <PageLoadState scope="section" what="Planetary horoscopes" failed={Boolean(error)} pending={holding} onRetry={refresh}>{holding?<PageLoading layout="placements" count={sky.positions.length} message="Loading planet readings…"/>:<div className="horoscope-planet-grid">{sky.positions.map(position=>{
    const window=planetaryHoroscopeWindow(position,sky.generatedAt);
    const timeZone=position.transitTimeZone??sky.location.timeZone??'UTC';
    const dateFormat=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone});
    const title=`${position.planet}${position.motion==='retrograde'?' Rx':''} in ${position.sign}`;
    const at=Date.parse(sky.generatedAt);
    const progress=window&&at>=window.start.getTime()&&at<=window.end.getTime()?(at-window.start.getTime())/(window.end.getTime()-window.start.getTime()):undefined;
    return <PlanetPlacementRow key={position.planet} variant="sky" title={title} glyph={position.glyph} pointName={position.planet} sign={position.sign}
      ariaLabel={`${title} · Read horoscope`} href={href(position)}
      degree={`Your ${ordinalHouse(planetaryHouse(position,sign))} house · ${formatPlanetDegree(position)}`}
      description={planetaryHoroscopeBody(position,sign)}
      rangeLabel={window?dateFormat.formatRange(window.start,window.end):null}
      progress={progress} retrograde={position.motion==='retrograde'}/>
  })}</div>}</PageLoadState>;
}
