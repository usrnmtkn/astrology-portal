import type { AdminDraft } from './GeneratedContentAdminDashboard';
import { SKY_PLACEMENT_ASPECT_BRIDGE_POLICY, skyPlacementAspectBridgeIdentity } from '../../web/src/content/skyPlacementAspectBridge';

export function skyPlacementAspectBridgeDraft(contentKey: string): AdminDraft {
  const identity = skyPlacementAspectBridgeIdentity(contentKey);
  if (!identity) throw new Error('Choose a supported house and aspect contact.');
  const title = (value: string) => value.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
  const record = { contentKey, content_role: 'fallback_hook', grammar_frame: 'complete_sentence',
    render_policy: SKY_PLACEMENT_ASPECT_BRIDGE_POLICY, body: '', review_status: 'needs_review' };
  return { id: null, contentKey, surface: 'sky', mode: 'in_depth', status: 'DRAFT', lane: 'reference', reviewState: 'needs-review',
    headline: `House ${identity.house} · ${title(identity.transiting)} ${identity.aspect} your ${title(identity.natal)}`,
    summary: '', body: '', blockType: 'fallback_hook', promptVersion: 'manual-admin', reviewerNotes: '',
    sections: { packageRecord: record }, facts: { fallbackArchitectureV3: true },
    sourceSnapshot: { contentType: 'sky-placement-house-aspect-bridge', contentSystem: 'fallback', content_role: 'fallback_hook',
      review_status: 'needs_review', sourcePackage: 'tldrastro-fallback-architecture-v3', authoringSource: 'admin-dashboard' } };
}
