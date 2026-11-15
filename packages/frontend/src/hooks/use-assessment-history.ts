import { useCallback, useEffect, useState } from 'react';

import { deleteAssessment, listAssessments, type AssessmentSummary } from '@/lib/assessment-store';
import { friendlyDataError } from '@/lib/errors';
import { getRayfinClient } from '@/lib/rayfin-client';

type HistoryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: AssessmentSummary[]; hasNextPage: boolean; endCursor: string | null; loadingMore: boolean; moreError: string | null };

/** The signed-in user's saved assessments, newest first, one page at a time. */
export function useAssessmentHistory() {
  const [state, setState] = useState<HistoryState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await listAssessments(await getRayfinClient());
        if (!cancelled) setState({ status: 'ready', ...page, loadingMore: false, moreError: null });
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: friendlyDataError(error, 'load your saved assessments') });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setReloadKey((key) => key + 1);
  }, []);

  const loadMore = useCallback(async () => {
    if (state.status !== 'ready' || !state.hasNextPage) return;
    setState({ ...state, loadingMore: true, moreError: null });
    try {
      const page = await listAssessments(await getRayfinClient(), state.endCursor);
      setState({ status: 'ready', items: [...state.items, ...page.items], hasNextPage: page.hasNextPage, endCursor: page.endCursor, loadingMore: false, moreError: null });
    } catch (error) {
      setState({ ...state, loadingMore: false, moreError: friendlyDataError(error, 'load more assessments') });
    }
  }, [state]);

  /** Deletes an assessment; resolves to an error message on failure. */
  const remove = useCallback(async (id: string): Promise<string | null> => {
    try {
      await deleteAssessment(await getRayfinClient(), id);
      setState((current) => (current.status === 'ready' ? { ...current, items: current.items.filter((item) => item.id !== id) } : current));
      return null;
    } catch (error) {
      return friendlyDataError(error, 'delete this assessment');
    }
  }, []);

  return { state, retry, loadMore, remove };
}
