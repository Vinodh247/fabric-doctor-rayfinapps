import { buildRoadmap, type AssessmentEvaluation, type Quadrant, type RoadmapItem } from '@rayfin-app/shared';
import { Check, ClipboardCopy, Gauge } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { SeverityBadge, StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { PHASE_LABEL, buildRoadmapText } from '@/lib/roadmap-text';
import { SEVERITY_META } from '@/lib/tones';
import { cn } from '@/lib/utils';

const QUADRANTS: { id: Quadrant; title: string; hint: string }[] = [
  { id: 'quick-win', title: 'Quick wins', hint: 'High impact, low effort. Do these first.' },
  { id: 'major-project', title: 'Major projects', hint: 'High impact, more effort. Plan and resource them.' },
  { id: 'fill-in', title: 'Fill-ins', hint: 'Lower impact, low effort. Fit around other work.' },
  { id: 'later', title: 'Later', hint: 'Lower impact, more effort. Revisit after the rest.' },
];

function ItemChip({ item }: { item: RoadmapItem }) {
  const meta = SEVERITY_META[item.finding.severity];
  return (
    <li className="flex items-start gap-200 rounded-lg border border-border bg-card px-300 py-200 text-300 leading-300">
      <meta.Icon aria-label={meta.label} className={cn('mt-100-nudge icon-size-200 shrink-0', meta.text)} />
      <span className="min-w-0 flex-1">{item.finding.title}</span>
      <span className="font-numeric text-200 leading-300 font-semibold text-band-excellent tabular-nums">+{item.impact}</span>
    </li>
  );
}

export function RoadmapPanel({ result }: { result: AssessmentEvaluation }) {
  const roadmap = useMemo(() => buildRoadmap(result), [result]);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'manual'>('idle');
  const text = useMemo(() => buildRoadmapText(result, roadmap), [result, roadmap]);

  useEffect(() => {
    if (copied !== 'copied') return;
    const timer = setTimeout(() => setCopied('idle'), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopied('copied');
    } catch {
      setCopied('manual');
    }
  }

  if (roadmap.items.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-600 text-center text-300 leading-300 text-muted-foreground">
        No gaps to plan. Every applicable control is already Good or Mature.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-800">
      {/* Phases */}
      <section aria-labelledby="phases-heading" className="flex flex-col gap-400">
        <div className="flex flex-wrap items-end justify-between gap-300">
          <div className="flex flex-col gap-100">
            <h3 id="phases-heading" className="text-500 leading-500 font-semibold">
              30 / 60 / 90-day plan
            </h3>
            <p className="text-300 leading-300 text-muted-foreground">
              Critical findings and quick wins come first. Each phase shows the projected rating once its gaps reach Good.
            </p>
          </div>
          <Button variant="secondary" onClick={copy}>
            {copied === 'copied' ? <Check /> : <ClipboardCopy />}
            {copied === 'copied' ? 'Roadmap copied' : 'Copy roadmap'}
          </Button>
        </div>
        <span className="sr-only" role="status">
          {copied === 'copied' ? 'Roadmap copied to clipboard' : ''}
        </span>
        {copied === 'manual' && (
          <textarea
            readOnly
            value={text}
            rows={10}
            aria-label="Roadmap text"
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-lg border border-input bg-background p-300 font-monospace text-200 leading-200"
          />
        )}

        <ol className="grid grid-cols-1 gap-400 lg:grid-cols-3">
          {roadmap.phases.map((phase) => (
            <li key={phase.phase} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              <div className="flex flex-col gap-200 border-b border-border bg-muted/50 px-500 py-400">
                <span className="text-200 leading-200 font-semibold tracking-wide text-muted-foreground uppercase">{PHASE_LABEL[phase.phase]}</span>
                <span className="flex flex-wrap items-center gap-200 text-300 leading-300">
                  <Gauge aria-hidden className="icon-size-200 text-muted-foreground" />
                  Then
                  <span className="font-numeric font-bold tabular-nums">{phase.projected.overallScore}</span>
                  <StatusBadge status={phase.projected.overallStatus} size="sm" />
                </span>
              </div>
              {phase.items.length === 0 ? (
                <p className="px-500 py-400 text-300 leading-300 text-muted-foreground">Nothing scheduled.</p>
              ) : (
                <ul className="flex flex-col">
                  {phase.items.map((item) => (
                    <li key={item.finding.questionId} className="flex flex-col gap-200 border-b border-border px-500 py-400 last:border-b-0">
                      <div className="flex flex-wrap items-center gap-200">
                        <SeverityBadge severity={item.finding.severity} />
                        <span className="text-200 leading-200 text-muted-foreground">
                          {item.effort} effort · <span className="font-numeric font-semibold text-band-excellent">+{item.impact}</span>{' '}
                          {item.impact === 1 ? 'point' : 'points'}
                        </span>
                      </div>
                      <span className="text-300 leading-300 font-semibold">{item.finding.title}</span>
                      <span className="text-300 leading-300 text-muted-foreground">{item.finding.recommendation}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Impact × effort */}
      <section aria-labelledby="matrix-heading" className="flex flex-col gap-400">
        <div className="flex flex-col gap-100">
          <h3 id="matrix-heading" className="text-500 leading-500 font-semibold">
            Impact × effort
          </h3>
          <p className="text-300 leading-300 text-muted-foreground">
            Impact is the points gained by bringing the answer to Good. Critical findings always count as high impact.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-300 lg:grid-cols-[auto_1fr_1fr] lg:grid-rows-[auto_1fr_1fr]">
          <span aria-hidden className="hidden lg:col-start-2 lg:row-start-1 lg:block lg:text-center lg:text-200 lg:font-semibold lg:tracking-wide lg:text-muted-foreground lg:uppercase">
            Low effort
          </span>
          <span aria-hidden className="hidden lg:col-start-3 lg:row-start-1 lg:block lg:text-center lg:text-200 lg:font-semibold lg:tracking-wide lg:text-muted-foreground lg:uppercase">
            Medium / high effort
          </span>
          <span aria-hidden className="hidden lg:col-start-1 lg:row-start-2 lg:flex lg:items-center lg:text-200 lg:font-semibold lg:tracking-wide lg:text-muted-foreground lg:uppercase lg:[writing-mode:vertical-rl] lg:rotate-180">
            High impact
          </span>
          <span aria-hidden className="hidden lg:col-start-1 lg:row-start-3 lg:flex lg:items-center lg:text-200 lg:font-semibold lg:tracking-wide lg:text-muted-foreground lg:uppercase lg:[writing-mode:vertical-rl] lg:rotate-180">
            Lower impact
          </span>
          {QUADRANTS.map((quadrant) => {
            const items = roadmap.items.filter((i) => i.quadrant === quadrant.id);
            const position = {
              'quick-win': 'lg:col-start-2 lg:row-start-2',
              'major-project': 'lg:col-start-3 lg:row-start-2',
              'fill-in': 'lg:col-start-2 lg:row-start-3',
              later: 'lg:col-start-3 lg:row-start-3',
            }[quadrant.id];
            return (
              <section
                key={quadrant.id}
                aria-label={`${quadrant.title}: ${items.length}`}
                className={cn(
                  'flex min-w-0 flex-col gap-300 rounded-2xl border p-400',
                  quadrant.id === 'quick-win' ? 'border-primary/40 bg-accent' : 'border-border bg-muted/40',
                  position,
                )}
              >
                <div className="flex flex-col">
                  <span className="flex items-center justify-between gap-200 text-400 leading-400 font-semibold">
                    {quadrant.title}
                    <span className="font-numeric text-300 text-muted-foreground tabular-nums">{items.length}</span>
                  </span>
                  <span className="text-200 leading-200 text-muted-foreground">{quadrant.hint}</span>
                </div>
                {items.length > 0 && (
                  <ul className="flex flex-col gap-200">
                    {items.map((item) => (
                      <ItemChip key={item.finding.questionId} item={item} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
