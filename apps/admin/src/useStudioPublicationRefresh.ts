import { useCallback, useEffect, useRef, useState } from 'react';
import { contentPublicationsAvailableOnline, refreshContentPublicationsAfterUpdate } from '../../web/src/services/contentPublications';
import { subscribeToContentUpdates } from '../../web/src/services/contentUpdateSignal';

import { createStudioPublicationRefresh, type StudioPublicationRefreshState } from './studioPublicationRefresh';

export function useStudioPublicationRefresh(contentKey: string | undefined) {
  const [state, setState] = useState<StudioPublicationRefreshState>('idle');
  const controller = useRef<ReturnType<typeof createStudioPublicationRefresh> | null>(null);
  useEffect(() => {
    if (!contentKey) { setState('idle'); return; }
    const current = createStudioPublicationRefresh(contentKey, {
      refresh: refreshContentPublicationsAfterUpdate,
      online: contentPublicationsAvailableOnline,
      onState: setState
    });
    controller.current = current;
    const unsubscribe = subscribeToContentUpdates(current.notice);
    current.refresh();
    return () => {
      unsubscribe();
      current.dispose();
      if (controller.current === current) controller.current = null;
    };
  }, [contentKey]);
  const retry = useCallback(() => controller.current?.retry(), []);
  return { state, retry };
}
