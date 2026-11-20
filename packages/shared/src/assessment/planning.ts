import { STATUS_RANK, evaluateAssessment, isAnswerScore } from './engine.js';
import { QUESTIONS } from './questions.js';
import type {
  Answer,
  AnswerScore,
  AssessmentEvaluation,
  FindingResult,
  FixEffort,
  HealthStatus,
  Question,
} from './types.js';

/** A gap counts as fixed when its answer reaches "Good". */
export const FIX_TARGET: AnswerScore = 3;

/** Points gained at or above this count as high impact on the roadmap. */
export const HIGH_IMPACT_POINTS = 3;

const EFFORT_RANK: Record<FixEffort, number> = { low: 0, medium: 1, high: 2 };
const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

function question(id: string): Question {
  const found = QUESTION_BY_ID.get(id);
  if (!found) throw new Error(`Unknown question: ${id}`);
  return found;
}

/** The next answer level a fix aims for: "Good", or "Mature" once already good. */
function nextTarget(score: AnswerScore): AnswerScore {
  return score < FIX_TARGET ? FIX_TARGET : 4;
}

export interface Improvement {
  questionId: string;
  title: string;
  from: AnswerScore;
  to: AnswerScore;
  /** Change in the overall score from this step alone. */
  pointsGained: number;
  /** True when the step removes a critical finding. */
  resolvesCritical: boolean;
  effort: FixEffort;
}

function improvement(before: AssessmentEvaluation, questionId: string, to: AnswerScore): { step: Improvement; after: AssessmentEvaluation } {
  const from = before.answers[questionId] as AnswerScore;
  const after = evaluateAssessment({ ...before.answers, [questionId]: to });
  const q = question(questionId);
  return {
    after,
    step: {
      questionId,
      title: q.issue.title,
      from,
      to,
      pointsGained: after.overallScore - before.overallScore,
      resolvesCritical: after.criticalCount < before.criticalCount,
      effort: q.effort,
    },
  };
}

/** Overall points gained by raising one answer to `to` (default: "Good"). */
export function pointsForFix(result: AssessmentEvaluation, questionId: string, to: AnswerScore = FIX_TARGET): number {
  return improvement(result, questionId, to).step.pointsGained;
}

export interface BandPath {
  from: HealthStatus;
  to: HealthStatus;
  steps: Improvement[];
  result: AssessmentEvaluation;
}

/**
 * The shortest practical set of fixes that lifts the overall rating one band.
 *
 * Greedy: each step picks the single fix that improves the rating most, then
 * removes the most critical findings, then adds the most points, preferring lower
 * effort. Returns null when the rating is already Excellent.
 */
export function pathToNextBand(result: AssessmentEvaluation): BandPath | null {
  const startRank = STATUS_RANK[result.overallStatus];
  if (result.overallStatus === 'Excellent') {
    return null;
  }

  let current = result;
  const steps: Improvement[] = [];
  for (let guard = 0; guard < QUESTIONS.length * 2 && STATUS_RANK[current.overallStatus] <= startRank; guard++) {
    const candidates = QUESTIONS.filter((q) => {
      const answer = current.answers[q.id];
      return isAnswerScore(answer) && answer < 4;
    }).map((q) => improvement(current, q.id, nextTarget(current.answers[q.id] as AnswerScore)));

    if (candidates.length === 0) break;

    candidates.sort(
      (a, b) =>
        STATUS_RANK[b.after.overallStatus] - STATUS_RANK[a.after.overallStatus] ||
        a.after.criticalCount - b.after.criticalCount ||
        b.step.pointsGained - a.step.pointsGained ||
        EFFORT_RANK[a.step.effort] - EFFORT_RANK[b.step.effort],
    );
    const best = candidates[0];
    steps.push(best.step);
    current = best.after;
  }

  if (STATUS_RANK[current.overallStatus] <= startRank) {
    return null;
  }
  return { from: result.overallStatus, to: current.overallStatus, steps: mergeSteps(steps), result: current };
}

/** Collapses repeated steps on one question (e.g. Weak → Good → Mature) into a single step. */
function mergeSteps(steps: Improvement[]): Improvement[] {
  const merged = new Map<string, Improvement>();
  for (const step of steps) {
    const existing = merged.get(step.questionId);
    merged.set(
      step.questionId,
      existing
        ? {
            ...existing,
            to: step.to,
            pointsGained: existing.pointsGained + step.pointsGained,
            resolvesCritical: existing.resolvesCritical || step.resolvesCritical,
          }
        : step,
    );
  }
  return [...merged.values()];
}

export type Quadrant = 'quick-win' | 'major-project' | 'fill-in' | 'later';
export type Phase = 30 | 60 | 90;

export interface RoadmapItem {
  finding: FindingResult;
  effort: FixEffort;
  /** Overall points gained by bringing this answer to "Good". */
  impact: number;
  highImpact: boolean;
  quadrant: Quadrant;
  phase: Phase;
}

export interface RoadmapPhase {
  phase: Phase;
  items: RoadmapItem[];
  /** The projected result once this phase and every earlier phase are done. */
  projected: AssessmentEvaluation;
}

export interface Roadmap {
  items: RoadmapItem[];
  phases: RoadmapPhase[];
}

function quadrantFor(highImpact: boolean, effort: FixEffort): Quadrant {
  if (highImpact) return effort === 'low' ? 'quick-win' : 'major-project';
  return effort === 'low' ? 'fill-in' : 'later';
}

function phaseFor(item: Pick<RoadmapItem, 'finding' | 'quadrant' | 'effort'>): Phase {
  if (item.finding.severity === 'critical' || item.quadrant === 'quick-win') return 30;
  if (item.effort === 'high') return 90;
  return 60;
}

/**
 * Turns every gap into a prioritised 30/60/90-day plan.
 *
 * Critical findings and quick wins (high impact, low effort) come first; high-effort
 * work is scheduled last. Each phase shows the projected score once it is complete.
 */
export function buildRoadmap(result: AssessmentEvaluation): Roadmap {
  const items: RoadmapItem[] = result.findings
    .filter((f) => f.severity !== 'healthy')
    .map((finding) => {
      const effort = question(finding.questionId).effort;
      const impact = pointsForFix(result, finding.questionId);
      const highImpact = finding.severity === 'critical' || impact >= HIGH_IMPACT_POINTS;
      const quadrant = quadrantFor(highImpact, effort);
      return { finding, effort, impact, highImpact, quadrant, phase: phaseFor({ finding, quadrant, effort }) };
    })
    .sort(
      (a, b) =>
        a.phase - b.phase ||
        Number(b.finding.severity === 'critical') - Number(a.finding.severity === 'critical') ||
        b.impact - a.impact ||
        EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort],
    );

  const phases: RoadmapPhase[] = [];
  let answers: Record<string, Answer> = { ...result.answers };
  for (const phase of [30, 60, 90] as const) {
    const phaseItems = items.filter((item) => item.phase === phase);
    for (const item of phaseItems) {
      answers = { ...answers, [item.finding.questionId]: FIX_TARGET };
    }
    phases.push({ phase, items: phaseItems, projected: evaluateAssessment(answers) });
  }

  return { items, phases };
}
