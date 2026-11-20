import {
  ANSWER_SCORES,
  CATEGORIES,
  QUESTIONS,
  evaluateAssessment,
  isAnswerScore,
  pathToNextBand,
  type Answer,
  type AnswerScore,
  type AssessmentEvaluation,
} from '@rayfin-app/shared';
import { ArrowRight, FlaskConical, Route, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ScoreGauge } from '@/components/score-gauge';
import { StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { CATEGORY_ICONS, MATURITY_LABELS } from '@/lib/tones';
import { cn } from '@/lib/utils';

function Delta({ value, className }: { value: number; className?: string }) {
  if (value === 0) return <span className={cn('font-numeric text-muted-foreground tabular-nums', className)}>±0</span>;
  return (
    <span className={cn('font-numeric font-semibold tabular-nums', value > 0 ? 'text-band-excellent' : 'text-band-critical', className)}>
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

/**
 * Lets the user change answers and see the score, rating and categories update
 * live. A simulation only: nothing here is saved.
 */
export function WhatIfPanel({ result }: { result: AssessmentEvaluation }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(result.answers);
  const simulated = useMemo(() => evaluateAssessment(answers), [answers]);
  const path = useMemo(() => pathToNextBand(result), [result]);
  const changed = QUESTIONS.filter((q) => answers[q.id] !== result.answers[q.id]).length;

  function set(questionId: string, score: AnswerScore) {
    setAnswers((current) => ({ ...current, [questionId]: score }));
  }

  function applyPath() {
    if (!path) return;
    setAnswers({ ...result.answers, ...Object.fromEntries(path.steps.map((s) => [s.questionId, s.to])) });
  }

  return (
    <div className="flex flex-col gap-600">
      <p className="flex items-start gap-200 text-300 leading-300 text-muted-foreground">
        <FlaskConical aria-hidden className="mt-100-nudge icon-size-200 shrink-0 text-brand-foreground" />
        Change any answer to see how the score and rating would move. This is a simulation only. Your saved assessment does not change.
      </p>

      <div className="grid grid-cols-1 gap-600 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Live result */}
        <section aria-label="Simulated result" className="flex min-w-0 flex-col gap-400 rounded-2xl border border-border bg-card p-600 shadow-sm lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between gap-300">
            <span className="text-200 leading-200 font-semibold tracking-wide text-muted-foreground uppercase">Simulated result</span>
            <Button variant="ghost" onClick={() => setAnswers(result.answers)} disabled={changed === 0}>
              <RotateCcw />
              Reset
            </Button>
          </div>
          <div className="mx-auto w-full max-w-48">
            <ScoreGauge score={simulated.overallScore} maximum={simulated.maximumScore} status={simulated.overallStatus} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-300" aria-live="polite">
            <span className="flex items-center gap-200 text-300 leading-300 text-muted-foreground">
              <span className="font-numeric tabular-nums">{result.overallScore}</span>
              <StatusBadge status={result.overallStatus} size="sm" />
            </span>
            <ArrowRight aria-hidden className="icon-size-200 text-muted-foreground" />
            <span className="flex items-center gap-200 text-300 leading-300">
              <span className="font-numeric font-semibold tabular-nums">{simulated.overallScore}</span>
              <StatusBadge status={simulated.overallStatus} size="sm" />
              <Delta value={simulated.overallScore - result.overallScore} />
            </span>
          </div>
          <span className="sr-only" aria-live="polite">
            Simulated score {simulated.overallScore}, {simulated.overallStatus}.
          </span>
          <ul className="flex flex-col border-t border-border pt-300">
            {simulated.categories.map((category, index) => {
              const before = result.categories[index];
              const Icon = CATEGORY_ICONS[category.category];
              return (
                <li key={category.category} className="flex items-center gap-300 py-100 text-300 leading-300">
                  <Icon aria-hidden className="icon-size-200 text-muted-foreground" />
                  <span className="flex-1 truncate">{category.name}</span>
                  <span className="font-numeric tabular-nums">
                    {category.score}
                    <span className="text-muted-foreground">/{category.maximumScore}</span>
                  </span>
                  <Delta value={category.score - before.score} className="w-8 text-right" />
                </li>
              );
            })}
          </ul>
          {simulated.criticalCount > 0 && (
            <p className="text-200 leading-200 text-muted-foreground">
              {simulated.criticalCount} critical {simulated.criticalCount === 1 ? 'finding still caps' : 'findings still cap'} the rating.
            </p>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-600">
          {/* Path to the next band */}
          {path ? (
            <section aria-labelledby="path-heading" className="flex flex-col gap-300 rounded-2xl border border-primary/40 bg-accent p-500">
              <h3 id="path-heading" className="flex items-center gap-200 text-400 leading-400 font-semibold text-accent-foreground">
                <Route aria-hidden className="icon-size-300" />
                Path to {path.to}
              </h3>
              <p className="text-300 leading-300 text-accent-foreground">
                {path.steps.length === 1 ? 'One fix' : `${path.steps.length} fixes`} would take you from {result.overallScore} ({path.from}) to{' '}
                {path.result.overallScore} ({path.to}):
              </p>
              <ol className="flex flex-col gap-200">
                {path.steps.map((step, index) => (
                  <li key={step.questionId} className="flex items-start gap-300 rounded-lg bg-card px-300 py-200 text-300 leading-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary font-numeric text-200 font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">{step.title}</span>
                      <span className="text-200 leading-200 text-muted-foreground">
                        {MATURITY_LABELS[step.from]} → {MATURITY_LABELS[step.to]} · {step.effort} effort
                        {step.resolvesCritical && ' · removes a critical finding'}
                      </span>
                    </span>
                    <Delta value={step.pointsGained} />
                  </li>
                ))}
              </ol>
              <Button onClick={applyPath} className="self-start">
                <Sparkles />
                Simulate this path
              </Button>
            </section>
          ) : (
            <p className="rounded-2xl border border-border bg-card p-500 text-300 leading-300">
              Your estate is already rated <strong className="font-semibold">Excellent</strong>. Use the controls below to explore which answers matter most.
            </p>
          )}

          {/* Answer controls */}
          {CATEGORIES.map((category) => {
            const questions = QUESTIONS.filter((q) => q.category === category.id);
            return (
              <section key={category.id} aria-labelledby={`whatif-${category.id}`} className="flex flex-col gap-200">
                <h3 id={`whatif-${category.id}`} className="text-300 leading-300 font-semibold text-muted-foreground">
                  {category.name}
                </h3>
                <ul className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                  {questions.map((q) => {
                    const value = answers[q.id];
                    const original = result.answers[q.id];
                    const isChanged = value !== original;
                    return (
                      <li key={q.id} className={cn('flex flex-col gap-200 border-b border-border px-400 py-300 last:border-b-0 md:flex-row md:items-center', isChanged && 'bg-accent/50')}>
                        <span className="min-w-0 flex-1 text-300 leading-300">
                          {q.issue.title}
                          {isChanged && <span className="ml-200 text-200 font-semibold text-brand-foreground">changed</span>}
                        </span>
                        {isAnswerScore(value) ? (
                          <div role="radiogroup" aria-label={`Simulated answer: ${q.prompt}`} className="flex shrink-0 gap-100">
                            {ANSWER_SCORES.map((score) => (
                              <button
                                key={score}
                                type="button"
                                role="radio"
                                aria-checked={value === score}
                                aria-label={`${score}, ${MATURITY_LABELS[score]}${original === score ? ' (your answer)' : ''}`}
                                title={MATURITY_LABELS[score]}
                                onClick={() => set(q.id, score)}
                                className={cn(
                                  'relative h-8 w-8 rounded-md border font-numeric text-[length:var(--text-300)] font-semibold tabular-nums transition-colors',
                                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                  value === score ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card text-muted-foreground hover:bg-hover hover:text-foreground',
                                )}
                              >
                                {score}
                                {original === score && value !== score && (
                                  <span aria-hidden className="absolute -bottom-1 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full bg-muted-foreground/60" />
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-200 leading-200 text-muted-foreground">Not applicable</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
