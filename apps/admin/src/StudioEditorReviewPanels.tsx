import { lazy, Suspense, type ComponentProps } from 'react';
import { studioWritingMemoryKey } from '../../web/src/content/studioMemoryIdentity';
import ReviewWorkflowPanel from './ReviewWorkflowPanel';

const StudioMemoryFeedback = lazy(() => import('./StudioMemoryFeedback'));

/** Load review and memory setup only when a saved row's editor is opened. */
export default function StudioEditorReviewPanels({ isPackageDraft, articleSaveState, onWritingAction, ...review }: Omit<ComponentProps<typeof ReviewWorkflowPanel>, 'onCheck' | 'onGenerate'> & {
  isPackageDraft: boolean;
  articleSaveState?: string;
  onWritingAction: (action: 'generate' | 'recheck') => void;
}) {
  const { row, credential = '', unsaved } = review;
  return <>
    {studioWritingMemoryKey(row.content_key) && <Suspense fallback={null}>
      <StudioMemoryFeedback key={row.content_key} contentKey={row.content_key} credential={credential}
        revision={row.updated_at} unsaved={unsaved || Boolean(articleSaveState && articleSaveState !== 'saved')} />
    </Suspense>}
    {!isPackageDraft && <ReviewWorkflowPanel {...review}
      onCheck={() => onWritingAction('recheck')} onGenerate={() => onWritingAction('generate')} />}
  </>;
}
