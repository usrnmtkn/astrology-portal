import { connectionSourceDraft } from './connectionTransitSources';
import { frictionFlowSourceDraft } from './frictionFlowSources';
import { FRICTION_FLOW_PREFIX } from '../../web/src/content/frictionFlowTemplateValidation';
import { skyPlacementAspectBridgeDraft } from './skyPlacementAspectBridgeDraft';
import { SKY_PLACEMENT_ASPECT_BRIDGE_PREFIX } from '../../web/src/content/skyPlacementAspectBridge';

export function studioSourceDraft(key: string) {
  return key.startsWith(SKY_PLACEMENT_ASPECT_BRIDGE_PREFIX)
    ? skyPlacementAspectBridgeDraft(key)
    : key.startsWith(FRICTION_FLOW_PREFIX) ? frictionFlowSourceDraft(key) : connectionSourceDraft(key);
}
