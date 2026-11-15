import { CATEGORIES } from './categories.js';
import { QUESTIONS } from './questions.js';
import {
  MAX_ANSWER_SCORE,
  type AnswerScore,
  type AssessmentAnswers,
  type AssessmentEvaluation,
  type CategoryEvaluation,
  type FindingResult,
  type HealthStatus,
  type Question,
  type Severity,
} from './types.js';

/** Health bands, best first. A score belongs to the first band whose minimum it meets. */
export const HEALTH_BANDS: readonly { status: HealthStatus; minimum: number }[] = [
  { status: 'Excellent', minimum: 85 },
  { status: 'Healthy', minimum: 70 },
  { status: 'Needs Attention', minimum: 50 },
  { status: 'High Risk', minimum: 30 },
  { status: 'Critical', minimum: 0 },
];

/**
 * Critical findings cap the health rating regardless of the numeric score.
 * Rules are checked in order; the first one whose threshold is met applies.
 */
export const CRITICAL_OVERRIDES: readonly { minimumCriticalFindings: number; cap: HealthStatus }[] = [
  { minimumCriticalFindings: 3, cap: 'High Risk' },
  { minimumCriticalFindings: 1, cap: 'Needs Attention' },
];

const STATUS_RANK: Record<HealthStatus, number> = {
  Critical: 0,
  'High Risk': 1,
  'Needs Attention': 2,
  Healthy: 3,
  Excellent: 4,
};

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  healthy: 2,
};

/** Health band for a score out of `maximum` (default 100). */
export function statusForScore(score: number, maximum = 100): HealthStatus {
  const percentage = maximum > 0 ? (score / maximum) * 100 : 0;
  const band = HEALTH_BANDS.find((b) => percentage >= b.minimum);
  return band ? band.status : 'Critical';
}

/** Applies the critical-finding cap to a status, returning the worse of the two. */
export function applyCriticalOverride(status: HealthStatus, criticalCount: number): HealthStatus {
  const rule = CRITICAL_OVERRIDES.find((r) => criticalCount >= r.minimumCriticalFindings);
  if (!rule) {
    return status;
  }
  return STATUS_RANK[rule.cap] < STATUS_RANK[status] ? rule.cap : status;
}

/** Severity raised by an answer to a question. */
export function severityForAnswer(question: Question, score: AnswerScore): Severity {
  if (score >= 3) {
    return 'healthy';
  }
  if (score === 0 && question.zeroIsCritical) {
    return 'critical';
  }
  return 'warning';
}

function isAnswerScore(value: unknown): value is AnswerScore {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_ANSWER_SCORE;
}

/** Ids of questions that have no valid answer yet, in display order. */
export function getUnansweredQuestions(answers: AssessmentAnswers): string[] {
  return QUESTIONS.filter((q) => !isAnswerScore(answers[q.id])).map((q) => q.id);
}

function buildFinding(question: Question, score: AnswerScore): FindingResult {
  const severity = severityForAnswer(question, score);
  if (severity === 'healthy') {
    return {
      questionId: question.id,
      category: question.category,
      severity,
      answerScore: score,
      title: question.control.title,
      detail: question.control.description,
      whyItMatters: '',
      recommendation: '',
      references: question.references,
    };
  }
  return {
    questionId: question.id,
    category: question.category,
    severity,
    answerScore: score,
    title: question.issue.title,
    detail: question.issue.problem,
    whyItMatters: question.issue.whyItMatters,
    recommendation: question.issue.recommendation,
    references: question.references,
  };
}

function countBySeverity(findings: readonly FindingResult[], severity: Severity): number {
  return findings.filter((f) => f.severity === severity).length;
}

/**
 * Scores a completed assessment.
 *
 * Each category score is the share of available answer points earned, scaled to
 * the category's maximum and rounded. The overall score is the sum of the
 * rounded category scores, so the numbers shown on screen always add up.
 *
 * @throws if any question is unanswered or has an invalid score.
 */
export function evaluateAssessment(answers: AssessmentAnswers): AssessmentEvaluation {
  const unanswered = getUnansweredQuestions(answers);
  if (unanswered.length > 0) {
    throw new Error(`Assessment is incomplete. Unanswered questions: ${unanswered.join(', ')}`);
  }

  const questionOrder = new Map(QUESTIONS.map((q, index) => [q.id, index]));
  const categoryOrder = new Map(CATEGORIES.map((c, index) => [c.id, index]));

  const findings = QUESTIONS.map((q) => buildFinding(q, answers[q.id] as AnswerScore));

  const categories: CategoryEvaluation[] = CATEGORIES.map((category) => {
    const questions = QUESTIONS.filter((q) => q.category === category.id);
    const earned = questions.reduce((sum, q) => sum + (answers[q.id] as AnswerScore), 0);
    const available = questions.length * MAX_ANSWER_SCORE;
    const score = available > 0 ? Math.round((earned / available) * category.maximumScore) : 0;
    const categoryFindings = findings.filter((f) => f.category === category.id);
    const criticalCount = countBySeverity(categoryFindings, 'critical');
    const numericStatus = statusForScore(score, category.maximumScore);
    const status = applyCriticalOverride(numericStatus, criticalCount);

    return {
      category: category.id,
      name: category.name,
      score,
      maximumScore: category.maximumScore,
      percentage: Math.round((score / category.maximumScore) * 100),
      numericStatus,
      status,
      capped: status !== numericStatus,
      criticalCount,
      warningCount: countBySeverity(categoryFindings, 'warning'),
      healthyCount: countBySeverity(categoryFindings, 'healthy'),
    };
  });

  const overallScore = categories.reduce((sum, c) => sum + c.score, 0);
  const maximumScore = CATEGORIES.reduce((sum, c) => sum + c.maximumScore, 0);
  const criticalCount = countBySeverity(findings, 'critical');
  const numericStatus = statusForScore(overallScore, maximumScore);
  const overallStatus = applyCriticalOverride(numericStatus, criticalCount);

  const sortedFindings = [...findings].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (categoryOrder.get(a.category) ?? 0) - (categoryOrder.get(b.category) ?? 0) ||
      (questionOrder.get(a.questionId) ?? 0) - (questionOrder.get(b.questionId) ?? 0),
  );

  return {
    overallScore,
    maximumScore,
    numericStatus,
    overallStatus,
    ratingCapped: overallStatus !== numericStatus,
    criticalCount,
    warningCount: countBySeverity(findings, 'warning'),
    healthyCount: countBySeverity(findings, 'healthy'),
    categories,
    findings: sortedFindings,
  };
}

/**
 * Maps a finding to the persisted `Finding` entity's text fields. The entity
 * stores a single description, so "why it matters" is appended to the problem.
 */
export function toFindingFields(finding: FindingResult): {
  category: string;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
} {
  const description = finding.whyItMatters
    ? `${finding.detail}\n\nWhy it matters: ${finding.whyItMatters}`
    : finding.detail;
  return {
    category: finding.category,
    severity: finding.severity,
    title: finding.title,
    description,
    recommendation: finding.recommendation,
  };
}
