import { ArrowRight, History, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { useAssessmentHistory } from '@/hooks/use-assessment-history';
import type { AssessmentSummary } from '@/lib/assessment-store';
import { SEVERITY_META } from '@/lib/tones';
import { cn } from '@/lib/utils';

function formatDate(date: Date): string {
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function HistoryPanel({ onOpen }: { onOpen: (id: string) => void }) {
  const { state, retry, loadMore, remove } = useAssessmentHistory();

  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-400 pb-800">
      <div className="flex items-center gap-200">
        <History aria-hidden className="icon-size-300 text-muted-foreground" />
        <h2 id="history-heading" className="text-500 leading-500 font-semibold">
          Past assessments
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        {state.status === 'loading' && (
          <ul aria-label="Loading saved assessments" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-400 border-b border-border px-600 py-400 last:border-b-0">
                <span className="h-10 w-12 animate-pulse rounded-lg bg-muted" />
                <span className="flex flex-1 flex-col gap-200">
                  <span className="h-3 w-40 animate-pulse rounded bg-muted" />
                  <span className="h-3 w-24 animate-pulse rounded bg-muted" />
                </span>
              </li>
            ))}
          </ul>
        )}

        {state.status === 'error' && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-300 px-600 py-500">
            <p className="text-300 leading-300">{state.message}</p>
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {state.status === 'ready' && state.items.length === 0 && (
          <p className="px-600 py-600 text-center text-300 leading-300 text-muted-foreground">
            No saved assessments yet. Completed assessments are saved here automatically.
          </p>
        )}

        {state.status === 'ready' && state.items.length > 0 && (
          <>
            <ul>
              {state.items.map((item) => (
                <HistoryRow key={item.id} item={item} onOpen={onOpen} onDelete={remove} />
              ))}
            </ul>
            {(state.hasNextPage || state.moreError) && (
              <div className="flex flex-wrap items-center justify-center gap-300 border-t border-border px-600 py-300">
                {state.moreError && (
                  <p role="alert" className="text-300 leading-300 text-band-critical">
                    {state.moreError}
                  </p>
                )}
                {state.hasNextPage && (
                  <Button variant="ghost" onClick={loadMore} disabled={state.loadingMore}>
                    {state.loadingMore && <Loader2 className="animate-spin" />}
                    {state.loadingMore ? 'Loading…' : 'Show more'}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function HistoryRow({
  item,
  onOpen,
  onDelete,
}: {
  item: AssessmentSummary;
  onOpen: (id: string) => void;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    const message = await onDelete(item.id);
    // On success the row unmounts; only failures need local state.
    if (message) {
      setError(message);
      setDeleting(false);
      setConfirming(false);
    }
  }

  const counts = [
    { severity: 'critical' as const, count: item.criticalCount },
    { severity: 'warning' as const, count: item.warningCount },
    { severity: 'healthy' as const, count: item.healthyCount },
  ];

  return (
    <li className="flex flex-wrap items-center gap-x-400 gap-y-200 border-b border-border px-600 py-400 last:border-b-0">
      <span className="w-12 font-numeric text-hero-700 leading-hero-700 font-bold tabular-nums">{item.overallScore}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-100">
        <span className="flex flex-wrap items-center gap-200">
          <StatusBadge status={item.overallStatus} size="sm" />
          <span className="text-300 leading-300 text-muted-foreground">{formatDate(item.completedAt)}</span>
        </span>
        <span className="flex flex-wrap gap-300">
          {counts.map(({ severity, count }) => {
            const meta = SEVERITY_META[severity];
            return (
              <span key={severity} className={cn('flex items-center gap-100 text-200 leading-200', meta.text)}>
                <meta.Icon aria-hidden className="icon-size-100" />
                {count} {severity === 'healthy' ? 'healthy' : severity === 'critical' ? 'critical' : count === 1 ? 'warning' : 'warnings'}
              </span>
            );
          })}
        </span>
        {error && (
          <span role="alert" className="text-200 leading-200 text-band-critical">
            {error}
          </span>
        )}
      </span>
      <span className="flex items-center gap-200">
        {confirming ? (
          <>
            <span className="text-300 leading-300">Delete this assessment?</span>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80"
            >
              {deleting && <Loader2 className="animate-spin" />}
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" aria-label={`Delete assessment from ${formatDate(item.completedAt)}`} onClick={() => setConfirming(true)}>
              <Trash2 />
            </Button>
            <Button variant="secondary" onClick={() => onOpen(item.id)}>
              Open
              <ArrowRight />
            </Button>
          </>
        )}
      </span>
    </li>
  );
}
