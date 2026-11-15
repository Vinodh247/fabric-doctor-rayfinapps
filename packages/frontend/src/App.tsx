import {
  evaluateAssessment,
  type AnswerScore,
  type AssessmentAnswers,
  type AssessmentEvaluation,
} from '@rayfin-app/shared';
import { useState } from 'react';

import { AppHeader } from '@/components/app-header';
import { AssessmentScreen } from '@/features/assessment-screen';
import { ResultsScreen } from '@/features/results-screen';
import { WelcomeScreen } from '@/features/welcome-screen';

type View =
  | { name: 'welcome' }
  | { name: 'assessment'; step: number }
  | { name: 'results'; result: AssessmentEvaluation; completedAt: Date };

function App() {
  const [view, setView] = useState<View>({ name: 'welcome' });
  // Answers for the assessment in progress. Completed results are not kept here
  // across sessions; saving them belongs to Rayfin Data.
  const [answers, setAnswers] = useState<AssessmentAnswers>({});

  function goTo(next: View) {
    setView(next);
    window.scrollTo({ top: 0 });
  }

  function start() {
    setAnswers({});
    goTo({ name: 'assessment', step: 0 });
  }

  function complete() {
    goTo({ name: 'results', result: evaluateAssessment(answers), completedAt: new Date() });
  }

  return (
    <div className="min-h-full bg-background bg-instrument-grid">
      <AppHeader onHome={() => goTo({ name: 'welcome' })} />
      <main className="mx-auto max-w-6xl px-400 md:px-600">
        {view.name === 'welcome' && <WelcomeScreen onStart={start} />}
        {view.name === 'assessment' && (
          <AssessmentScreen
            answers={answers}
            step={view.step}
            onAnswer={(questionId: string, score: AnswerScore) => setAnswers((prev) => ({ ...prev, [questionId]: score }))}
            onStepChange={(step) => setView({ name: 'assessment', step })}
            onComplete={complete}
          />
        )}
        {view.name === 'results' && (
          <ResultsScreen
            result={view.result}
            completedAt={view.completedAt}
            onReview={() => goTo({ name: 'assessment', step: 0 })}
            onRestart={start}
          />
        )}
      </main>
    </div>
  );
}

export default App;
