import {skySeasonFallbackIdentity} from './skySeasonFallback.js';
import type {ContentPublication} from './contentPublicationState.js';

/** Discover exact dated-edition keys without initializing the prose compiler. */
export function skyIngressEssayPublicationKeys(publications:readonly ContentPublication[],context:{planet:string;sign:string}) {
  const prefix=`sky-article/${context.planet}/${context.sign}/`;
  return publications.filter(row=>row.state==='live'&&row.row_id
    &&((row.content_key.startsWith(prefix)&&/^(?:\d{4}\/\d{4}-\d{2}-\d{2}|\d{4}\/day\/\d{4}-\d{2}-\d{2})$/u.test(row.content_key.slice(prefix.length)))
      ||(skySeasonFallbackIdentity(row.content_key)?.planet===context.planet&&skySeasonFallbackIdentity(row.content_key)?.sign===context.sign)))
    .map(row=>row.content_key);
}
