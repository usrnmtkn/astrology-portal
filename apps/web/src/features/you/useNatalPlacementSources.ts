import { useEffect, useState } from 'react';
import { contentPublicationGeneration } from '../../content/contentPublicationState';
import { installNatalPlacementFallbackArchitectureV3Bundle } from '../../content/fallbackArchitectureV3Runtime';
import type { NatalPlacementSourceSelection } from '../../services/natalPlacementSources';

export function useNatalPlacementSources(selection: NatalPlacementSourceSelection | null) {
  const key = JSON.stringify(selection);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ key: '', status: 'loading' as 'loading' | 'ready' | 'error' });
  useEffect(() => {
    if (key === 'null') return;
    let cancelled = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setState(previous => ({ ...previous, key, status: 'loading' }));
    const read = import('../../services/natalPlacementSources')
      .then(({ prepareNatalPlacementSources }) => prepareNatalPlacementSources(JSON.parse(key), controller.signal));
    void Promise.race([read, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Natal reading timed out.')); }, 20_000);
    })]).then(bundle => {
      if (cancelled) return;
      installNatalPlacementFallbackArchitectureV3Bundle(bundle);
      setState({ key, status: 'ready' });
    }).catch(error => {
      if (!cancelled) {
        console.warn('Natal reading sources failed to load.', error);
        setState(previous => ({ ...previous, key, status: 'error' }));
      }
    }).finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [key, contentPublicationGeneration, retry]);
  return { status: state.key === key ? state.status : 'loading' as const, retry: () => setRetry(value => value + 1) };
}
