import {
  CATEGORIES,
  QUESTIONS,
  getUnansweredQuestions,
  type AnswerScore,
  type AssessmentAnswers,
  type Question,
} from '@rayfin-app/shared';
import { ArrowLeft, ArrowRight, Check, Gauge } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { CATEGORY_ICONS, MATURITY_LABELS } from '@/lib/tones';
import { cn } from '@/lib/utils';

interface AssessmentScreenProps {
  answers: AssessmentAnswers;
  step: number;
  onAnswer: (questionId: string, score: AnswerScore) => void;
  onStepChange: (step: number) => void;
  onComplete: () => void;
}

const QUESTION_NUMBER = new Map(QUESTIONS.map((q, index) => [q.id, index + 1]));

function questionsFor(step: number): Question[] {
  return QUESTIONS.filter((q) => q.category === CATEGORIES[step].id);
}

function answeredCount(questions: Question[], answers: AssessmentAnswers): number {
  return questions.filter((q) => answers[q.id] !== undefined).length;
}

export function AssessmentScreen({ answers, step, onAnswer, onStepChange, onComplete }: AssessmentScreenProps) {
  const category = CATEGORIES[step];
  const questions = questionsFor(step);
  const stepComplete = answeredCount(questions, answers) === questions.length;
  const isLastStep = step === CATEGORIES.length - 1;
  const unanswered = getUnansweredQuestions(answers);
  const totalAnswered = QUESTIONS.length - unanswered.length;
  const Icon = CATEGORY_ICONS[category.id];

  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const firstIncompleteStep = CATEGORIES.findIndex((c) => QUESTIONS.some((q) => q.category === c.id && unanswered.includes(q.id)));

  return (
    <div className="grid grid-cols-1 gap-600 py-600 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-800 lg:py-800">
      {/* Progress rail */}
      <nav aria-label="Assessment progress" className="lg:sticky lg:top-20 lg:self-start">
        <div className="mb-400 flex items-center justify-between lg:flex-col lg:items-start lg:gap-200 lg:px-300">
          <span className="text-200 leading-200 font-semibold tracking-wide text-muted-foreground uppercase">
            Step {step + 1} of {CATEGORIES.length}
          </span>
          <span className="font-numeric text-300 leading-300 text-muted-foreground tabular-nums">
            {totalAnswered}/{QUESTIONS.length} answered
          </span>
        </div>
        <div className="mb-400 h-1 overflow-hidden rounded-full bg-muted lg:hidden" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(totalAnswered / QUESTIONS.length) * 100}%` }} />
        </div>
        <ol className="hidden flex-col gap-100 lg:flex">
          {CATEGORIES.map((c, index) => {
            const done = answeredCount(questionsFor(index), answers);
            const complete = done === 3;
            const current = index === step;
            const StepIcon = CATEGORY_ICONS[c.id];
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onStepChange(index)}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center gap-300 rounded-lg px-300 py-200 text-left transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    current ? 'bg-card shadow-sm ring-1 ring-border' : 'hover:bg-card/70',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                      complete ? 'bg-primary text-primary-foreground' : current ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {complete ? <Check aria-hidden className="icon-size-200" /> : <StepIcon aria-hidden className="icon-size-200" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn('truncate text-300 leading-300', current ? 'font-semibold' : 'font-medium')}>{c.name}</span>
                    <span className="flex gap-100 pt-100" aria-label={`${done} of 3 answered`}>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className={cn('h-1 w-5 rounded-full', i < done ? 'bg-primary' : 'bg-border')} />
                      ))}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Category step */}
      <section aria-labelledby="step-heading" className="flex min-w-0 flex-col gap-600">
        <header className="flex items-start gap-400">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon aria-hidden className="icon-size-400" />
          </span>
          <div className="flex flex-col gap-100">
            <h1 id="step-heading" ref={headingRef} tabIndex={-1} className="font-heading text-hero-700 leading-hero-700 font-bold tracking-tight outline-none">
              {category.name}
            </h1>
            <p className="text-300 leading-300 text-muted-foreground">
              {category.description} Worth {category.maximumScore} of 100 points.
            </p>
          </div>
        </header>

        {questions.map((question) => (
          <QuestionCard key={question.id} question={question} value={answers[question.id]} onAnswer={onAnswer} />
        ))}

        <footer className="flex flex-wrap items-center justify-between gap-300 border-t border-border pt-600">
          <Button variant="secondary" onClick={() => onStepChange(step - 1)} disabled={step === 0}>
            <ArrowLeft />
            Back
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-300">
            {isLastStep && stepComplete && unanswered.length > 0 && firstIncompleteStep >= 0 && (
              <button
                type="button"
                onClick={() => onStepChange(firstIncompleteStep)}
                className="text-300 leading-300 font-medium text-brand-foreground underline-offset-4 hover:underline"
              >
                {unanswered.length} unanswered in {CATEGORIES[firstIncompleteStep].name}
              </button>
            )}
            {isLastStep ? (
              <Button onClick={onComplete} disabled={unanswered.length > 0}>
                <Gauge />
                See results
              </Button>
            ) : (
              <Button onClick={() => onStepChange(step + 1)} disabled={!stepComplete}>
                Next: {CATEGORIES[step + 1].name}
                <ArrowRight />
              </Button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}

function QuestionCard({
  question,
  value,
  onAnswer,
}: {
  question: Question;
  value: AnswerScore | undefined;
  onAnswer: (questionId: string, score: AnswerScore) => void;
}) {
  const number = QUESTION_NUMBER.get(question.id);
  const promptId = `${question.id}-prompt`;
  return (
    <fieldset className="rounded-2xl border border-border bg-card p-500 shadow-xs md:p-600" aria-labelledby={promptId}>
      <div className="mb-400 flex flex-col gap-100">
        <span className="font-numeric text-200 leading-200 font-semibold text-brand-foreground">
          Question {number} of {QUESTIONS.length}
        </span>
        <h2 id={promptId} className="text-500 leading-500 font-semibold">
          {question.prompt}
        </h2>
        {question.helpText && <p className="text-300 leading-300 text-muted-foreground">{question.helpText}</p>}
      </div>
      <div className="flex flex-col gap-200">
        {question.options.map((option) => {
          const selected = value === option.score;
          return (
            <label
              key={option.score}
              className={cn(
                'group flex cursor-pointer items-start gap-300 rounded-xl border px-400 py-300 transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                selected ? 'border-primary bg-accent' : 'border-border hover:border-input hover:bg-hover',
              )}
            >
              <input
                type="radio"
                name={question.id}
                value={option.score}
                checked={selected}
                onChange={() => onAnswer(question.id, option.score)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'mt-100-nudge flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-numeric text-200 font-semibold tabular-nums transition-colors',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-muted-foreground group-hover:text-foreground',
                )}
              >
                {option.score}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-100-nudge">
                <span className={cn('text-300 leading-300', selected ? 'font-medium text-accent-foreground' : 'text-foreground')}>{option.label}</span>
                <span className="text-200 leading-200 text-muted-foreground">{MATURITY_LABELS[option.score]}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
