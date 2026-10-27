import { connectionSourceDraft } from './connectionTransitSources';
import { skyPlacementAspectBridgeDraft } from './skyPlacementAspectBridgeDraft';
import { SKY_PLACEMENT_ASPECT_BRIDGE_PREFIX } from '../../web/src/content/skyPlacementAspectBridge';

export function studioSourceDraft(key: string) {
  return key.startsWith(SKY_PLACEMENT_ASPECT_BRIDGE_PREFIX)
    ? skyPlacementAspectBridgeDraft(key)
    : connectionSourceDraft(key);
}
