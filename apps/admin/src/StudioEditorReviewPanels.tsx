import { lazy, Suspense, type ComponentProps } from 'react';
import { studioArticleMemoryKey } from '../../web/src/content/studioMemoryIdentity';
import ReviewWorkflowPanel from './ReviewWorkflowPanel';

const StudioMemoryFeedback = lazy(() => import('./StudioMemoryFeedback'));

/** Load review and memory setup only when a saved row's editor is opened. */
export default function StudioEditorReviewPanels({ isPackageDraft, articleUnsaved, ...review }: ComponentProps<typeof ReviewWorkflowPanel> & {
  isPackageDraft: boolean;
  articleUnsaved: boolean;
}) {
  const { row, credential = '', unsaved } = review;
  return <>
    {studioArticleMemoryKey(row.content_key) && <Suspense fallback={null}>
      <StudioMemoryFeedback key={row.content_key} contentKey={row.content_key} credential={credential}
        revision={row.updated_at} unsaved={unsaved || articleUnsaved} />
    </Suspense>}
    {!isPackageDraft && <ReviewWorkflowPanel {...review} />}
  </>;
}
