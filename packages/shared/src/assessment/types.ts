/**
 * Types for the Fabric Doctor assessment rules engine.
 *
 * Everything in `assessment/` is pure, browser-safe TypeScript with no Rayfin
 * or React dependencies, so it can be unit-tested and reused by any package.
 */

export type CategoryId =
  | 'platform-architecture'
  | 'data-engineering'
  | 'security'
  | 'governance'
  | 'devops'
  | 'observability';

export interface Category {
  id: CategoryId;
  name: string;
  /** Points this category contributes to the overall score (all categories sum to 100). */
  maximumScore: number;
  description: string;
}

/**
 * 0 = serious anti-pattern, 1 = weak, 2 = developing, 3 = good, 4 = mature.
 */
export type AnswerScore = 0 | 1 | 2 | 3 | 4;

export const ANSWER_SCORES: readonly AnswerScore[] = [0, 1, 2, 3, 4];

export const MAX_ANSWER_SCORE: AnswerScore = 4;

export interface AnswerOption {
  score: AnswerScore;
  label: string;
}

/** Finding shown when the answer reveals a gap (score 0–2). */
export interface IssueTemplate {
  title: string;
  problem: string;
  whyItMatters: string;
  recommendation: string;
}

/** Finding shown when the answer reveals a healthy control (score 3–4). */
export interface ControlTemplate {
  title: string;
  description: string;
}

export interface Question {
  id: string;
  category: CategoryId;
  prompt: string;
  helpText?: string;
  /** Exactly five options, ordered by score 0 → 4. */
  options: readonly [AnswerOption, AnswerOption, AnswerOption, AnswerOption, AnswerOption];
  /** When true, a score of 0 raises a critical finding instead of a warning. */
  zeroIsCritical: boolean;
  issue: IssueTemplate;
  control: ControlTemplate;
}

export type Severity = 'critical' | 'warning' | 'healthy';

export type HealthStatus =
  | 'Excellent'
  | 'Healthy'
  | 'Needs Attention'
  | 'High Risk'
  | 'Critical';

/** Answers keyed by question id. Missing keys are unanswered questions. */
export type AssessmentAnswers = Partial<Record<string, AnswerScore>>;

export interface FindingResult {
  questionId: string;
  category: CategoryId;
  severity: Severity;
  answerScore: AnswerScore;
  title: string;
  /** The problem for an issue, or what is working for a healthy control. */
  detail: string;
  /** Empty for healthy controls. */
  whyItMatters: string;
  /** Empty for healthy controls. */
  recommendation: string;
}

export interface CategoryEvaluation {
  category: CategoryId;
  name: string;
  score: number;
  maximumScore: number;
  /** 0–100, rounded to a whole number. */
  percentage: number;
  /** Band from the score alone. */
  numericStatus: HealthStatus;
  /** Band after critical findings are applied. */
  status: HealthStatus;
  /** True when critical findings lowered `status` below `numericStatus`. */
  capped: boolean;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
}

export interface AssessmentEvaluation {
  overallScore: number;
  maximumScore: number;
  numericStatus: HealthStatus;
  overallStatus: HealthStatus;
  ratingCapped: boolean;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  categories: CategoryEvaluation[];
  /** Sorted critical → warning → healthy, then by category and question order. */
  findings: FindingResult[];
}
