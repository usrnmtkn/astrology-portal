import type {AdminDraft} from './GeneratedContentAdminDashboard';
import type {StudioContentDocument} from './generatedContentClient';
import {compatibilityAspectKey} from './compatibilityAspectSources';
import {compatibilityAspectSourceDraft} from './compatibilityAspectDraft';
import {bondEffectExactSourceDraft} from './bondEffectExactDraft';

type MissingSource = {draft: AdminDraft} | {row: StudioContentDocument['rows'][number]};
/** Reuse an existing reverse-order activation before offering an empty source. */
export async function missingFriendsSource(
  contentKey: string,
  load: (key: string) => Promise<Pick<StudioContentDocument, 'rows'>>
): Promise<MissingSource | null> {
  if (contentKey.startsWith('fallback-hook/synastry-pair/')) {
    const [first, second, aspect, extra] = contentKey.slice('fallback-hook/synastry-pair/'.length).split('/');
    const selection = {first, second, aspect};
    if (extra || compatibilityAspectKey(selection) !== contentKey) return null;
    const reverseKey = compatibilityAspectKey({first: second, second: first, aspect})!;
    const reverse = reverseKey === contentKey ? null : await load(reverseKey);
    if (reverse?.rows.some(row => row.content_key !== reverseKey)) throw new Error('The reverse-order source could not be verified. Reload before creating this activation.');
    const saved = reverse?.rows.find(row => row.content_key === reverseKey);
    return saved ? {row: saved} : {draft: compatibilityAspectSourceDraft(selection)};
  }
  const draft = bondEffectExactSourceDraft(contentKey);
  return draft ? {draft} : null;
}
