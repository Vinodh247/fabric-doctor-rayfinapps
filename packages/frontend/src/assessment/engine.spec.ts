import { describe, expect, it } from 'vitest';

import {
  ANSWER_SCORES,
  CATEGORIES,
  QUESTIONS,
  applyCriticalOverride,
  evaluateAssessment,
  getUnansweredQuestions,
  statusForScore,
  toFindingFields,
  type AnswerScore,
  type AssessmentAnswers,
} from '@rayfin-app/shared';

function answerAll(score: AnswerScore, overrides: AssessmentAnswers = {}): AssessmentAnswers {
  return { ...Object.fromEntries(QUESTIONS.map((q) => [q.id, score])), ...overrides };
}

const criticalQuestionIds = QUESTIONS.filter((q) => q.zeroIsCritical).map((q) => q.id);

describe('assessment configuration', () => {
  it('has category maximums that sum to 100', () => {
    expect(CATEGORIES.reduce((sum, c) => sum + c.maximumScore, 0)).toBe(100);
  });

  it('has 18 questions with unique ids, three per category', () => {
    expect(QUESTIONS).toHaveLength(18);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(18);
    for (const category of CATEGORIES) {
      expect(QUESTIONS.filter((q) => q.category === category.id)).toHaveLength(3);
    }
  });

  it('gives every question five options ordered by score 0 to 4', () => {
    for (const question of QUESTIONS) {
      expect(question.options.map((o) => o.score)).toEqual(ANSWER_SCORES);
      for (const option of question.options) {
        expect(option.label.trim()).not.toBe('');
      }
    }
  });

  it('gives every question complete finding text', () => {
    for (const question of QUESTIONS) {
      const { title, problem, whyItMatters, recommendation } = question.issue;
      for (const text of [title, problem, whyItMatters, recommendation, question.control.title, question.control.description]) {
        expect(text.trim()).not.toBe('');
      }
      // Must fit the persisted Finding entity's column limits.
      const fields = toFindingFields({
        questionId: question.id,
        category: question.category,
        severity: 'warning',
        answerScore: 1,
        title,
        detail: problem,
        whyItMatters,
        recommendation,
      });
      expect(fields.title.length).toBeLessThanOrEqual(200);
      expect(fields.description.length).toBeLessThanOrEqual(2000);
      expect(fields.recommendation.length).toBeLessThanOrEqual(2000);
    }
  });
});

describe('statusForScore', () => {
  it.each([
    [100, 'Excellent'],
    [85, 'Excellent'],
    [84, 'Healthy'],
    [70, 'Healthy'],
    [69, 'Needs Attention'],
    [50, 'Needs Attention'],
    [49, 'High Risk'],
    [30, 'High Risk'],
    [29, 'Critical'],
    [0, 'Critical'],
  ] as const)('maps %i to %s', (score, status) => {
    expect(statusForScore(score)).toBe(status);
  });

  it('uses the percentage of a category maximum', () => {
    expect(statusForScore(17, 20)).toBe('Excellent'); // 85%
    expect(statusForScore(10, 15)).toBe('Needs Attention'); // 66.7%
  });
});

describe('applyCriticalOverride', () => {
  it('leaves the status alone with no critical findings', () => {
    expect(applyCriticalOverride('Excellent', 0)).toBe('Excellent');
  });

  it('caps at Needs Attention for one or two critical findings', () => {
    expect(applyCriticalOverride('Excellent', 1)).toBe('Needs Attention');
    expect(applyCriticalOverride('Healthy', 2)).toBe('Needs Attention');
  });

  it('caps at High Risk for three or more critical findings', () => {
    expect(applyCriticalOverride('Excellent', 3)).toBe('High Risk');
  });

  it('never improves a worse status', () => {
    expect(applyCriticalOverride('Critical', 1)).toBe('Critical');
    expect(applyCriticalOverride('High Risk', 1)).toBe('High Risk');
  });
});

describe('evaluateAssessment', () => {
  it('scores a fully mature estate as 100 and Excellent', () => {
    const result = evaluateAssessment(answerAll(4));
    expect(result.overallScore).toBe(100);
    expect(result.maximumScore).toBe(100);
    expect(result.overallStatus).toBe('Excellent');
    expect(result.ratingCapped).toBe(false);
    expect(result.healthyCount).toBe(18);
    expect(result.criticalCount + result.warningCount).toBe(0);
  });

  it('scores an all-anti-pattern estate as 0 and Critical', () => {
    const result = evaluateAssessment(answerAll(0));
    expect(result.overallScore).toBe(0);
    expect(result.overallStatus).toBe('Critical');
    expect(result.criticalCount).toBe(criticalQuestionIds.length);
    expect(result.warningCount).toBe(18 - criticalQuestionIds.length);
  });

  it('treats score 2 as a warning and score 3 as healthy', () => {
    expect(evaluateAssessment(answerAll(2)).warningCount).toBe(18);
    expect(evaluateAssessment(answerAll(3)).healthyCount).toBe(18);
  });

  it('makes the overall score the sum of the displayed category scores', () => {
    const result = evaluateAssessment(answerAll(2));
    // 50% of 20, 20, 15, 15, 15, 15 → 10 + 10 + 8 × 4 (7.5 rounds up)
    expect(result.categories.map((c) => c.score)).toEqual([10, 10, 8, 8, 8, 8]);
    expect(result.overallScore).toBe(52);
    expect(result.overallStatus).toBe('Needs Attention');
  });

  it('lets one critical finding cap an otherwise excellent score', () => {
    const result = evaluateAssessment(answerAll(4, { 'security-workspace-access': 0 }));
    expect(result.overallScore).toBe(95);
    expect(result.numericStatus).toBe('Excellent');
    expect(result.overallStatus).toBe('Needs Attention');
    expect(result.ratingCapped).toBe(true);
    expect(result.criticalCount).toBe(1);

    const security = result.categories.find((c) => c.category === 'security');
    expect(security).toMatchObject({ score: 10, maximumScore: 15, percentage: 67, criticalCount: 1 });
  });

  it('caps at High Risk with three critical findings', () => {
    const overrides = Object.fromEntries(criticalQuestionIds.slice(0, 3).map((id) => [id, 0 as AnswerScore]));
    const result = evaluateAssessment(answerAll(4, overrides));
    expect(result.criticalCount).toBe(3);
    expect(result.overallStatus).toBe('High Risk');
  });

  it('raises a warning, not a critical, when a non-critical question scores 0', () => {
    const question = QUESTIONS.find((q) => !q.zeroIsCritical)!;
    const result = evaluateAssessment(answerAll(4, { [question.id]: 0 }));
    expect(result.criticalCount).toBe(0);
    expect(result.warningCount).toBe(1);
    expect(result.ratingCapped).toBe(false);
  });

  it('caps a category with a critical finding even when its score is high', () => {
    // Two mature answers and one critical in a 20-point category: 8/12 → 13/20 (65%).
    const result = evaluateAssessment(answerAll(4, { 'engineering-data-quality': 0 }));
    const engineering = result.categories.find((c) => c.category === 'data-engineering')!;
    expect(engineering.score).toBe(13);
    expect(engineering.status).toBe('Needs Attention');
  });

  it('sorts findings critical, then warning, then healthy', () => {
    const result = evaluateAssessment(
      answerAll(4, { 'observability-audit': 1, 'platform-workspaces': 0, 'platform-capacity': 2 }),
    );
    expect(result.findings.slice(0, 3).map((f) => [f.severity, f.questionId])).toEqual([
      ['critical', 'platform-workspaces'],
      ['warning', 'platform-capacity'],
      ['warning', 'observability-audit'],
    ]);
    expect(result.findings.slice(3).every((f) => f.severity === 'healthy')).toBe(true);
  });

  it('uses issue text for gaps and control text for healthy answers', () => {
    const result = evaluateAssessment(answerAll(4, { 'devops-deployment': 1 }));
    const question = QUESTIONS.find((q) => q.id === 'devops-deployment')!;
    const issue = result.findings.find((f) => f.questionId === 'devops-deployment')!;
    expect(issue).toMatchObject({ severity: 'warning', title: question.issue.title, recommendation: question.issue.recommendation });

    const healthy = result.findings.find((f) => f.questionId === 'devops-testing')!;
    expect(healthy.recommendation).toBe('');
    expect(healthy.whyItMatters).toBe('');
  });

  it('refuses an incomplete assessment and names the missing questions', () => {
    const answers = answerAll(3);
    delete answers['governance-ownership'];
    expect(getUnansweredQuestions(answers)).toEqual(['governance-ownership']);
    expect(() => evaluateAssessment(answers)).toThrow(/governance-ownership/);
  });

  it('treats out-of-range scores as unanswered', () => {
    const answers = answerAll(3, { 'security-credentials': 7 as AnswerScore });
    expect(getUnansweredQuestions(answers)).toEqual(['security-credentials']);
    expect(() => evaluateAssessment(answers)).toThrow();
  });
});

describe('toFindingFields', () => {
  it('appends why it matters to the description for issues', () => {
    const result = evaluateAssessment(answerAll(4, { 'security-credentials': 0 }));
    const fields = toFindingFields(result.findings[0]);
    expect(fields.severity).toBe('critical');
    expect(fields.description).toContain('\n\nWhy it matters: ');
  });

  it('uses the control description alone for healthy findings', () => {
    const result = evaluateAssessment(answerAll(4));
    const fields = toFindingFields(result.findings[0]);
    expect(fields.description).not.toContain('Why it matters');
  });
});
