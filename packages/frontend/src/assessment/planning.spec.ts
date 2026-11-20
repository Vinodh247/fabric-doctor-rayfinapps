import {
  CATEGORIES,
  FIX_TARGET,
  NOT_APPLICABLE,
  QUESTIONS,
  STATUS_RANK,
  buildRoadmap,
  evaluateAssessment,
  getUnansweredQuestions,
  pathToNextBand,
  pointsForFix,
  type Answer,
  type AnswerScore,
  type AssessmentAnswers,
} from '@rayfin-app/shared';
import { describe, expect, it } from 'vitest';

function answerAll(score: AnswerScore, overrides: AssessmentAnswers = {}): AssessmentAnswers {
  return { ...Object.fromEntries(QUESTIONS.map((q) => [q.id, score])), ...overrides };
}

const naQuestions = QUESTIONS.filter((q) => q.notApplicable);

describe('not applicable answers', () => {
  it('is only offered where a category still has a scored question', () => {
    expect(naQuestions.length).toBeGreaterThan(0);
    for (const category of CATEGORIES) {
      expect(QUESTIONS.some((q) => q.category === category.id && !q.notApplicable)).toBe(true);
    }
  });

  it('counts as answered only on questions that allow it', () => {
    const allowed = naQuestions[0].id;
    const notAllowed = QUESTIONS.find((q) => !q.notApplicable)!.id;
    expect(getUnansweredQuestions(answerAll(3, { [allowed]: NOT_APPLICABLE }))).toEqual([]);
    expect(getUnansweredQuestions(answerAll(3, { [notAllowed]: NOT_APPLICABLE as Answer }))).toEqual([notAllowed]);
  });

  it('excludes the question from scoring and findings', () => {
    // Delta maintenance not applicable; the other two data engineering answers are mature.
    const result = evaluateAssessment(answerAll(4, { 'engineering-delta-maintenance': NOT_APPLICABLE }));
    const engineering = result.categories.find((c) => c.category === 'data-engineering')!;
    expect(engineering.score).toBe(20);
    expect(engineering.notApplicableCount).toBe(1);
    expect(result.overallScore).toBe(100);
    expect(result.findings).toHaveLength(QUESTIONS.length - 1);
    expect(result.notApplicable).toEqual(['engineering-delta-maintenance']);
  });

  it('scores a category only on the questions that apply', () => {
    // Ingestion and delta not applicable; data quality "Developing" (2/4) → 10/20.
    const result = evaluateAssessment(
      answerAll(4, { 'engineering-ingestion': NOT_APPLICABLE, 'engineering-delta-maintenance': NOT_APPLICABLE, 'engineering-data-quality': 2 }),
    );
    expect(result.categories.find((c) => c.category === 'data-engineering')!.score).toBe(10);
  });

  it('keeps the complete answers on the result', () => {
    const answers = answerAll(2, { 'observability-pipelines': NOT_APPLICABLE });
    expect(evaluateAssessment(answers).answers).toEqual(answers);
  });
});

describe('every question has an effort rating', () => {
  it('uses low, medium or high', () => {
    for (const q of QUESTIONS) {
      expect(['low', 'medium', 'high']).toContain(q.effort);
    }
  });
});

describe('pointsForFix', () => {
  it('reports the overall points gained by bringing one answer to Good', () => {
    const result = evaluateAssessment(answerAll(4, { 'security-workspace-access': 0 }));
    // Security 8/12 → 11/12 of 15 points: 10 → 14.
    expect(pointsForFix(result, 'security-workspace-access')).toBe(4);
    expect(FIX_TARGET).toBe(3);
  });
});

describe('pathToNextBand', () => {
  it('returns nothing for an Excellent estate', () => {
    expect(pathToNextBand(evaluateAssessment(answerAll(4)))).toBeNull();
  });

  it('fixes the critical finding first when it caps the rating', () => {
    const result = evaluateAssessment(answerAll(4, { 'security-workspace-access': 0 }));
    const path = pathToNextBand(result)!;
    expect(path.from).toBe('Needs Attention');
    expect(path.steps).toHaveLength(1);
    expect(path.steps[0]).toMatchObject({ questionId: 'security-workspace-access', from: 0, to: 3, resolvesCritical: true });
    expect(path.to).toBe('Excellent');
  });

  it('reaches a better band, and every step adds value', () => {
    const result = evaluateAssessment(answerAll(2));
    const path = pathToNextBand(result)!;
    expect(STATUS_RANK[path.to]).toBeGreaterThan(STATUS_RANK[result.overallStatus]);
    expect(path.result.overallScore).toBeGreaterThan(result.overallScore);
    for (const step of path.steps) {
      expect(step.to).toBeGreaterThan(step.from);
      expect(step.pointsGained > 0 || step.resolvesCritical).toBe(true);
    }
  });

  it('lists each question at most once, with the combined gain', () => {
    // Mixed answers where the greedy search raises one question twice (Weak → Good → Mature).
    const pattern: AnswerScore[] = [3, 2, 4, 3, 1, 3, 0, 3, 2, 2, 3, 3, 1, 2, 3, 3, 2, 4];
    const result = evaluateAssessment(Object.fromEntries(QUESTIONS.map((q, i) => [q.id, pattern[i]])));
    const path = pathToNextBand(result)!;
    const ids = path.steps.map((s) => s.questionId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(path.steps.reduce((sum, s) => sum + s.pointsGained, 0)).toBe(path.result.overallScore - result.overallScore);
    const delta = path.steps.find((s) => s.questionId === 'engineering-delta-maintenance');
    expect(delta).toMatchObject({ from: 1, to: 4 });
  });

  it('never touches not-applicable questions', () => {
    const result = evaluateAssessment(answerAll(1, { 'engineering-delta-maintenance': NOT_APPLICABLE }));
    let path = pathToNextBand(result);
    while (path) {
      expect(path.steps.map((s) => s.questionId)).not.toContain('engineering-delta-maintenance');
      path = pathToNextBand(path.result);
    }
  });
});

describe('buildRoadmap', () => {
  it('has no items for an estate without gaps', () => {
    const roadmap = buildRoadmap(evaluateAssessment(answerAll(3)));
    expect(roadmap.items).toEqual([]);
    expect(roadmap.phases.map((p) => p.projected.overallScore)).toEqual([74, 74, 74]);
  });

  it('schedules critical findings in the first 30 days regardless of effort', () => {
    // Sensitive data unrestricted (critical, high effort).
    const roadmap = buildRoadmap(evaluateAssessment(answerAll(4, { 'security-data-level': 0 })));
    expect(roadmap.items).toHaveLength(1);
    expect(roadmap.items[0]).toMatchObject({ phase: 30, effort: 'high', highImpact: true, quadrant: 'major-project' });
  });

  it('puts quick wins first and high-effort work last', () => {
    const roadmap = buildRoadmap(
      evaluateAssessment(answerAll(4, { 'governance-ownership': 0, 'devops-testing': 1, 'devops-deployment': 2 })),
    );
    const phaseOf = (id: string) => roadmap.items.find((i) => i.finding.questionId === id)!.phase;
    expect(phaseOf('governance-ownership')).toBe(30); // low effort, high impact
    expect(phaseOf('devops-deployment')).toBe(60); // medium effort
    expect(phaseOf('devops-testing')).toBe(90); // high effort
  });

  it('projects a rising score as each phase completes, ending with every gap at Good or better', () => {
    const result = evaluateAssessment(answerAll(1));
    const roadmap = buildRoadmap(result);
    expect(roadmap.items).toHaveLength(QUESTIONS.length);
    const scores = [result.overallScore, ...roadmap.phases.map((p) => p.projected.overallScore)];
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
    expect(roadmap.phases[2].projected.overallScore).toBe(evaluateAssessment(answerAll(3)).overallScore);
  });
});
