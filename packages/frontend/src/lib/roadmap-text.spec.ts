import { QUESTIONS, buildRoadmap, evaluateAssessment, type AnswerScore } from '@rayfin-app/shared';
import { describe, expect, it } from 'vitest';

import { buildRoadmapText } from './roadmap-text';

describe('buildRoadmapText', () => {
  it('lists each phase with its projection and items, with docs links', () => {
    const answers = { ...Object.fromEntries(QUESTIONS.map((q) => [q.id, 4 as AnswerScore])), 'security-workspace-access': 0 as AnswerScore };
    const result = evaluateAssessment(answers);
    const text = buildRoadmapText(result, buildRoadmap(result));
    expect(text).toContain('Today: 95/100, Needs Attention');
    expect(text).toContain('Next 30 days (projected 99/100, Excellent)');
    expect(text).toContain('- [Critical] Workspace access is over-privileged (low effort, +4 points)');
    expect(text).toContain('Docs: https://learn.microsoft.com/fabric/fundamentals/roles-workspaces');
    expect(text).toContain('Days 31–60 (projected 99/100, Excellent)\n- Nothing scheduled');
  });
});
