import { CATEGORIES, getCategory, type AssessmentEvaluation, type CategoryId, type FindingResult, type Reference, type Severity } from '@rayfin-app/shared';
import { BookOpen, ExternalLink, Lightbulb } from 'lucide-react';
import { useState } from 'react';

import { SeverityBadge } from '@/components/status';
import { SEVERITY_META } from '@/lib/tones';
import { cn } from '@/lib/utils';

type SeverityFilter = 'all' | Severity;

export function FindingsPanel({ result }: { result: AssessmentEvaluation }) {
  const [severity, setSeverity] = useState<SeverityFilter>(result.criticalCount + result.warningCount > 0 ? 'all' : 'healthy');
  const [category, setCategory] = useState<'all' | CategoryId>('all');

  const counts: Record<SeverityFilter, number> = {
    all: result.findings.length,
    critical: result.criticalCount,
    warning: result.warningCount,
    healthy: result.healthyCount,
  };

  const visible = result.findings.filter(
    (f) => (severity === 'all' || f.severity === severity) && (category === 'all' || f.category === category),
  );

  const filters: { id: SeverityFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'critical', label: SEVERITY_META.critical.plural },
    { id: 'warning', label: SEVERITY_META.warning.plural },
    { id: 'healthy', label: SEVERITY_META.healthy.plural },
  ];

  return (
    <div className="flex flex-col gap-500">
      <div className="flex flex-wrap items-center justify-between gap-300">
        <div role="group" aria-label="Filter by severity" className="flex flex-wrap gap-200">
          {filters.map((filter) => {
            const active = severity === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSeverity(filter.id)}
                className={cn(
                  'flex h-8 items-center gap-200 rounded-full border px-300 text-[length:var(--text-300)] font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-hover',
                )}
              >
                {filter.label}
                <span className={cn('font-numeric tabular-nums', active ? 'opacity-85' : 'text-muted-foreground')}>{counts[filter.id]}</span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-200 text-300 leading-300 text-muted-foreground">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as 'all' | CategoryId)}
            className="h-8 rounded-lg border border-input bg-card px-200 text-[length:var(--text-300)] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card px-600 py-800 text-center text-300 leading-300 text-muted-foreground">
          No findings match these filters.
        </p>
      ) : (
        <ul className="flex flex-col gap-300">
          {visible.map((finding) => (
            <li key={finding.questionId}>
              <FindingCard finding={finding} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ACCENT_BORDER: Record<Severity, string> = {
  critical: 'border-l-band-critical',
  warning: 'border-l-band-attention',
  healthy: 'border-l-band-excellent',
};

export function FindingCard({ finding }: { finding: FindingResult }) {
  const categoryName = getCategory(finding.category).name;
  const isIssue = finding.severity !== 'healthy';
  return (
    <article className={cn('rounded-xl border border-l-4 border-border bg-card shadow-xs', ACCENT_BORDER[finding.severity])}>
      <div className={cn('flex flex-col gap-200 px-500', isIssue ? 'pt-400 pb-300' : 'py-300')}>
        <div className="flex flex-wrap items-center gap-200">
          <SeverityBadge severity={finding.severity} />
          <span className="text-200 leading-200 text-muted-foreground">{categoryName}</span>
        </div>
        <h3 className="text-400 leading-400 font-semibold">{finding.title}</h3>
        <p className="text-300 leading-300 text-muted-foreground">{finding.detail}</p>
      </div>
      {isIssue && (
        <div className="grid gap-400 border-t border-border px-500 py-400 md:grid-cols-2">
          <div className="flex flex-col gap-100">
            <span className="text-200 leading-200 font-semibold tracking-wide text-muted-foreground uppercase">Why it matters</span>
            <p className="text-300 leading-300">{finding.whyItMatters}</p>
          </div>
          <div className="flex flex-col gap-100 rounded-lg bg-accent px-400 py-300 text-accent-foreground">
            <span className="flex items-center gap-100 text-200 leading-200 font-semibold tracking-wide uppercase">
              <Lightbulb aria-hidden className="icon-size-100" />
              Recommendation
            </span>
            <p className="text-300 leading-300">{finding.recommendation}</p>
          </div>
        </div>
      )}
      {finding.references.length > 0 && <References references={finding.references} compact={!isIssue} />}
    </article>
  );
}

/** Official Microsoft Learn pages that back a finding. Links open in a new tab. */
function References({ references, compact }: { references: readonly Reference[]; compact: boolean }) {
  return (
    <div className={cn('flex flex-col gap-200 border-t border-border px-500', compact ? 'py-300' : 'py-400')}>
      <span className="flex items-center gap-100 text-200 leading-200 font-semibold tracking-wide text-muted-foreground uppercase">
        <BookOpen aria-hidden className="icon-size-100" />
        Microsoft Learn documentation
      </span>
      <ul className="flex flex-col gap-100">
        {references.map((reference) => (
          <li key={reference.url}>
            <a
              href={reference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-start gap-100 rounded-sm text-300 leading-300 text-brand-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span>{reference.title}</span>
              <ExternalLink aria-hidden className="mt-100-nudge icon-size-100 shrink-0 opacity-70 group-hover:opacity-100" />
              <span className="sr-only">(opens Microsoft Learn in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
