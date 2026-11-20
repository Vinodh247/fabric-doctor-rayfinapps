import { pathToNextBand, type AssessmentEvaluation, type CategoryEvaluation, type Severity } from '@rayfin-app/shared';
import { ArrowRight, Check, CircleAlert, ClipboardCopy, CloudCheck, Info, Loader2, PencilLine, RotateCcw, Route } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { ScoreGauge } from '@/components/score-gauge';
import { StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { FindingCard, FindingsPanel } from '@/features/findings-panel';
import { RoadmapPanel } from '@/features/roadmap-panel';
import { WhatIfPanel } from '@/features/whatif-panel';
import { buildShareSummary } from '@/lib/share-summary';
import { CATEGORY_ICONS, SEVERITY_META, STATUS_TONE } from '@/lib/tones';
import { cn } from '@/lib/utils';

export type SaveState = { status: 'saving' } | { status: 'saved' } | { status: 'error'; message: string };

interface ResultsScreenProps {
  result: AssessmentEvaluation;
  completedAt: Date;
  save: SaveState;
  /** Shown above the results, e.g. when a saved result was re-scored by newer rules. */
  notice?: string;
  onRetrySave: () => void;
  onReview: () => void;
  onRestart: () => void;
}

type Tab = 'overview' | 'findings' | 'roadmap' | 'whatif';

const HEADLINE: Record<AssessmentEvaluation['overallStatus'], string> = {
  Excellent: 'A mature, well-run Fabric estate.',
  Healthy: 'Solid foundations with a few gaps to close.',
  'Needs Attention': 'Important gaps need a plan.',
  'High Risk': 'Significant risks need prompt action.',
  Critical: 'Foundational controls are missing.',
};

export function ResultsScreen({ result, completedAt, save, notice, onRetrySave, onReview, onRestart }: ResultsScreenProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'findings', label: `Findings (${result.findings.length})` },
    { id: 'roadmap', label: 'Roadmap' },
    { id: 'whatif', label: 'What-if' },
  ];
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const index = tabs.findIndex((t) => t.id === tab);
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-600 py-600 lg:py-800">
      <div className="flex flex-wrap items-end justify-between gap-400">
        <div className="flex flex-col gap-100">
          <span className="text-200 leading-200 font-semibold tracking-wide text-muted-foreground uppercase">Assessment results</span>
          <h1 className="font-heading text-hero-700 leading-hero-700 font-bold tracking-tight">Fabric architecture health</h1>
          <SaveIndicator save={save} onRetry={onRetrySave} />
        </div>
        <div className="flex flex-wrap gap-200">
          <Button variant="ghost" onClick={onReview}>
            <PencilLine />
            Review answers
          </Button>
          <Button variant="ghost" onClick={onRestart}>
            <RotateCcw />
            New assessment
          </Button>
          <ShareButton result={result} completedAt={completedAt} />
        </div>
      </div>

      {notice && (
        <p className="flex items-start gap-200 rounded-xl border border-border bg-card px-400 py-300 text-300 leading-300">
          <Info aria-hidden className="mt-100-nudge icon-size-200 shrink-0 text-brand-foreground" />
          {notice}
        </p>
      )}

      <div role="tablist" aria-label="Results views" className="flex gap-100 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={onTabKey}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-400 py-200 text-[length:var(--text-300)] font-semibold whitespace-nowrap transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'overview' && (
          <Overview
            result={result}
            completedAt={completedAt}
            onShowFindings={() => setTab('findings')}
            onShowWhatIf={() => setTab('whatif')}
          />
        )}
        {tab === 'findings' && <FindingsPanel result={result} />}
        {tab === 'roadmap' && <RoadmapPanel result={result} />}
        {tab === 'whatif' && <WhatIfPanel result={result} />}
      </div>
    </div>
  );
}

function Overview({
  result,
  completedAt,
  onShowFindings,
  onShowWhatIf,
}: {
  result: AssessmentEvaluation;
  completedAt: Date;
  onShowFindings: () => void;
  onShowWhatIf: () => void;
}) {
  const path = pathToNextBand(result);
  const priorities = result.findings.filter((f) => f.severity !== 'healthy').slice(0, 3);
  const severities: Severity[] = ['critical', 'warning', 'healthy'];
  const counts: Record<Severity, number> = {
    critical: result.criticalCount,
    warning: result.warningCount,
    healthy: result.healthyCount,
  };

  return (
    <div className="grid grid-cols-1 gap-600 lg:grid-cols-3">
      {/* Score hero */}
      <section
        aria-label="Overall health"
        className="grid min-w-0 grid-cols-1 gap-600 rounded-2xl border border-border bg-card p-500 shadow-sm md:grid-cols-[240px_1fr] md:p-600 md:items-center lg:col-span-3 lg:p-800"
      >
        <ScoreGauge score={result.overallScore} maximum={result.maximumScore} status={result.overallStatus} />
        <div className="flex flex-col gap-400">
          <div className="flex flex-wrap items-center gap-300">
            <StatusBadge status={result.overallStatus} />
            <span className="text-200 leading-200 text-muted-foreground">
              Completed{' '}
              {completedAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <h2 className={cn('font-heading text-hero-800 leading-hero-800 font-bold tracking-tight', STATUS_TONE[result.overallStatus].text)}>
            {result.overallStatus}
          </h2>
          <p className="text-400 leading-400 text-muted-foreground">{HEADLINE[result.overallStatus]}</p>
          {result.ratingCapped && (
            <p className="rounded-lg border border-band-critical/30 bg-band-critical/8 px-400 py-300 text-300 leading-300">
              The score alone rates <strong className="font-semibold">{result.numericStatus}</strong>, but{' '}
              {result.criticalCount === 1 ? '1 critical finding caps' : `${result.criticalCount} critical findings cap`} the rating at{' '}
              <strong className="font-semibold">{result.overallStatus}</strong>.
            </p>
          )}
          <dl className="grid grid-cols-3 gap-200 pt-200 md:gap-300">
            {severities.map((severity) => {
              const meta = SEVERITY_META[severity];
              return (
                <div key={severity} className={cn('flex min-w-0 flex-col gap-100 rounded-xl px-300 py-300 md:px-400', meta.bg)}>
                  <dt className={cn('flex items-center gap-100 text-200 leading-200 font-semibold', meta.text)}>
                    <meta.Icon aria-hidden className="icon-size-100" />
                    {severity === 'healthy' ? 'Healthy' : meta.plural}
                  </dt>
                  <dd className="font-numeric text-hero-700 leading-hero-700 font-bold tabular-nums">{counts[severity]}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      {path && (
        <button
          type="button"
          onClick={onShowWhatIf}
          className="group flex flex-wrap items-center gap-300 rounded-2xl border border-primary/40 bg-accent px-600 py-400 text-left text-accent-foreground transition-colors hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:col-span-3"
        >
          <Route aria-hidden className="icon-size-300 shrink-0" />
          <span className="min-w-0 flex-1 text-400 leading-400">
            <strong className="font-semibold">
              {path.steps.length === 1 ? 'One fix' : `${path.steps.length} fixes`} to reach {path.to}.
            </strong>{' '}
            <span className="text-300">
              {result.overallScore} → {path.result.overallScore}, starting with {path.steps[0].title.toLowerCase()}.
            </span>
          </span>
          <span className="flex items-center gap-100 text-300 font-semibold">
            Explore in What-if
            <ArrowRight aria-hidden className="icon-size-200 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      )}

      {/* Category breakdown */}
      <section aria-labelledby="categories-heading" className="min-w-0 rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
        <div className="flex items-baseline justify-between border-b border-border px-600 py-400">
          <h2 id="categories-heading" className="text-400 leading-400 font-semibold">
            Category scores
          </h2>
          <span className="text-200 leading-200 text-muted-foreground">Score / weight</span>
        </div>
        <ul className="flex flex-col">
          {result.categories.map((category, index) => (
            <CategoryRow key={category.category} category={category} index={index} />
          ))}
        </ul>
      </section>

      {/* Priorities */}
      <section aria-labelledby="priorities-heading" className="flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-600 py-400">
          <h2 id="priorities-heading" className="text-400 leading-400 font-semibold">
            Top priorities
          </h2>
        </div>
        {priorities.length === 0 ? (
          <p className="flex-1 px-600 py-600 text-300 leading-300 text-muted-foreground">
            No critical findings or warnings. Every control assessed is in good shape.
          </p>
        ) : (
          <ol className="flex flex-1 flex-col">
            {priorities.map((finding, index) => {
              const meta = SEVERITY_META[finding.severity];
              return (
                <li key={finding.questionId} className="flex gap-300 border-b border-border px-600 py-400 last:border-b-0">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-numeric text-200 font-bold', meta.bg, meta.text)}>
                    {index + 1}
                  </span>
                  <span className="flex flex-col gap-100">
                    <span className="text-300 leading-300 font-semibold">{finding.title}</span>
                    <span className={cn('text-200 leading-200 font-medium', meta.text)}>{meta.label}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <div className="border-t border-border p-400">
          <Button variant="secondary" className="w-full justify-center" onClick={onShowFindings}>
            View all findings
            <ArrowRight />
          </Button>
        </div>
      </section>

      {priorities[0] && (
        <section aria-labelledby="first-fix-heading" className="flex min-w-0 flex-col gap-300 lg:col-span-3">
          <h2 id="first-fix-heading" className="text-400 leading-400 font-semibold">
            Start here
          </h2>
          <FindingCard finding={priorities[0]} />
        </section>
      )}
    </div>
  );
}

function CategoryRow({ category, index }: { category: CategoryEvaluation; index: number }) {
  const Icon = CATEGORY_ICONS[category.category];
  const tone = STATUS_TONE[category.status];
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-400 gap-y-200 border-b border-border px-500 py-400 last:border-b-0 md:px-600">
      <span className="row-span-2 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon aria-hidden className="icon-size-300" />
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-200">
        <span className="text-300 leading-300 font-semibold">{category.name}</span>
        <StatusBadge status={category.status} size="sm" />
        {category.capped && <span className="text-200 leading-200 text-muted-foreground">capped by critical finding</span>}
      </span>
      <span className="font-numeric text-400 leading-400 font-semibold tabular-nums">
        {category.score}
        <span className="text-300 font-normal text-muted-foreground">/{category.maximumScore}</span>
      </span>
      <div
        className="col-span-2 h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={`${category.name} score`}
        aria-valuemin={0}
        aria-valuemax={category.maximumScore}
        aria-valuenow={category.score}
      >
        <div
          className={cn('h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out', tone.fill)}
          style={{ width: filled ? `${category.percentage}%` : '0%', transitionDelay: `${index * 70}ms` }}
        />
      </div>
    </li>
  );
}

function SaveIndicator({ save, onRetry }: { save: SaveState; onRetry: () => void }) {
  return (
    <div role="status" className="flex min-h-6 flex-wrap items-center gap-200 text-300 leading-300">
      {save.status === 'saving' && (
        <span className="flex items-center gap-100 text-muted-foreground">
          <Loader2 aria-hidden className="icon-size-200 animate-spin" />
          Saving to your account…
        </span>
      )}
      {save.status === 'saved' && (
        <span className="flex items-center gap-100 text-muted-foreground">
          <CloudCheck aria-hidden className="icon-size-200 text-band-excellent" />
          Saved to your account
        </span>
      )}
      {save.status === 'error' && (
        <>
          <span className="flex items-center gap-100 text-band-critical">
            <CircleAlert aria-hidden className="icon-size-200" />
            Not saved. {save.message}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold text-brand-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Retry
          </button>
        </>
      )}
    </div>
  );
}

function ShareButton({ result, completedAt }: { result: AssessmentEvaluation; completedAt: Date }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const summary = buildShareSummary(result, completedAt);

  useEffect(() => {
    if (state !== 'copied') return;
    const timer = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(summary);
      setState('copied');
    } catch {
      // Clipboard access can be blocked inside embedded hosts; let the user copy by hand.
      setState('manual');
    }
  }

  return (
    <>
      <Button onClick={copy}>
        {state === 'copied' ? <Check /> : <ClipboardCopy />}
        {state === 'copied' ? 'Summary copied' : 'Copy summary'}
      </Button>
      <span className="sr-only" role="status">
        {state === 'copied' ? 'Summary copied to clipboard' : ''}
      </span>
      {state === 'manual' && (
        <div className="basis-full rounded-xl border border-border bg-card p-400 shadow-sm">
          <div className="mb-200 flex items-center justify-between gap-300">
            <p className="text-300 leading-300">Copying isn't available here. Select the summary below and copy it.</p>
            <Button variant="ghost" onClick={() => setState('idle')}>
              Close
            </Button>
          </div>
          <textarea
            readOnly
            value={summary}
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Result summary"
            rows={10}
            className="w-full rounded-lg border border-input bg-background p-300 font-monospace text-200 leading-200"
          />
        </div>
      )}
    </>
  );
}
