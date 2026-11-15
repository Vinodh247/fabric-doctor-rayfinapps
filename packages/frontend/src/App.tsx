import {
  evaluateAssessment,
  type AnswerScore,
  type AssessmentAnswers,
  type AssessmentEvaluation,
} from '@rayfin-app/shared';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { AssessmentScreen } from '@/features/assessment-screen';
import { ResultsScreen, type SaveState } from '@/features/results-screen';
import { WelcomeScreen } from '@/features/welcome-screen';
import { loadAssessment, saveAssessment } from '@/lib/assessment-store';
import { friendlyDataError } from '@/lib/errors';
import { getRayfinClient } from '@/lib/rayfin-client';

type View =
  | { name: 'welcome' }
  | { name: 'assessment'; step: number }
  | { name: 'opening' }
  | { name: 'open-failed'; message: string }
  | { name: 'results'; result: AssessmentEvaluation; completedAt: Date; save: SaveState; notice?: string };

function App() {
  const [view, setView] = useState<View>({ name: 'welcome' });
  // Answers for the assessment being filled in. Completed results live in Rayfin Data.
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  // Guards against a stale async save or load updating a view the user has left.
  const requestId = useRef(0);

  function goTo(next: View) {
    requestId.current++;
    setView(next);
    window.scrollTo({ top: 0 });
  }

  function start() {
    setAnswers({});
    goTo({ name: 'assessment', step: 0 });
  }

  async function save(result: AssessmentEvaluation, completedAt: Date) {
    const id = requestId.current;
    const update = (save: SaveState) =>
      setView((current) => (id === requestId.current && current.name === 'results' ? { ...current, save } : current));
    update({ status: 'saving' });
    try {
      await saveAssessment(await getRayfinClient(), result, completedAt);
      update({ status: 'saved' });
    } catch (error) {
      update({ status: 'error', message: friendlyDataError(error, 'save this assessment') });
    }
  }

  function complete() {
    const result = evaluateAssessment(answers);
    const completedAt = new Date();
    goTo({ name: 'results', result, completedAt, save: { status: 'saving' } });
    void save(result, completedAt);
  }

  async function open(assessmentId: string) {
    goTo({ name: 'opening' });
    const id = requestId.current;
    try {
      const loaded = await loadAssessment(await getRayfinClient(), assessmentId);
      if (id !== requestId.current) return;
      setAnswers(Object.fromEntries(loaded.result.findings.map((f) => [f.questionId, f.answerScore])));
      setView({
        name: 'results',
        result: loaded.result,
        completedAt: loaded.completedAt,
        save: { status: 'saved' },
        notice: loaded.rescored
          ? `Scored with the current assessment rules. This result was originally saved as ${loaded.savedScore}/100, ${loaded.savedStatus}.`
          : undefined,
      });
    } catch (error) {
      if (id !== requestId.current) return;
      setView({ name: 'open-failed', message: friendlyDataError(error, 'open this assessment') });
    }
  }

  return (
    <div className="min-h-full bg-background bg-instrument-grid">
      <AppHeader onHome={() => goTo({ name: 'welcome' })} />
      <main className="mx-auto max-w-6xl px-400 md:px-600">
        {view.name === 'welcome' && <WelcomeScreen onStart={start} onOpen={open} />}
        {view.name === 'assessment' && (
          <AssessmentScreen
            answers={answers}
            step={view.step}
            onAnswer={(questionId: string, score: AnswerScore) => setAnswers((prev) => ({ ...prev, [questionId]: score }))}
            onStepChange={(step) => setView({ name: 'assessment', step })}
            onComplete={complete}
          />
        )}
        {view.name === 'opening' && (
          <div role="status" className="flex items-center justify-center gap-200 py-800 text-300 leading-300 text-muted-foreground">
            <Loader2 aria-hidden className="icon-size-200 animate-spin" />
            Opening assessment…
          </div>
        )}
        {view.name === 'open-failed' && (
          <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-400 py-800 text-center">
            <p className="text-400 leading-400">{view.message}</p>
            <Button variant="secondary" onClick={() => goTo({ name: 'welcome' })}>
              <ArrowLeft />
              Back to assessments
            </Button>
          </div>
        )}
        {view.name === 'results' && (
          <ResultsScreen
            result={view.result}
            completedAt={view.completedAt}
            save={view.save}
            notice={view.notice}
            onRetrySave={() => void save(view.result, view.completedAt)}
            onReview={() => goTo({ name: 'assessment', step: 0 })}
            onRestart={start}
          />
        )}
      </main>
    </div>
  );
}

export default App;
