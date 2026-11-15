import { QUESTIONS, evaluateAssessment } from '@rayfin-app/shared';
import { describe, expect, it } from 'vitest';

import { buildShareSummary } from './share-summary';

const all = (score: 0 | 4) => Object.fromEntries(QUESTIONS.map((q) => [q.id, score]));

describe('buildShareSummary', () => {
  it('explains a capped rating and lists top priorities', () => {
    const result = evaluateAssessment({ ...all(4), 'security-workspace-access': 0 });
    const text = buildShareSummary(result, new Date('2026-11-15T10:00:00Z'));
    expect(text).toContain('Completed 2026-11-15');
    expect(text).toContain('Overall: 95/100, Needs Attention (score alone rates Excellent; capped by 1 critical finding)');
    expect(text).toContain('- Security: 10/15 (Needs Attention)');
    expect(text).toContain('1. [Critical] Workspace access is over-privileged');
    expect(text).toContain('Docs: https://learn.microsoft.com/fabric/fundamentals/roles-workspaces');
  });

  it('omits the priorities section when everything is healthy', () => {
    const text = buildShareSummary(evaluateAssessment(all(4)), new Date('2026-11-15T10:00:00Z'));
    expect(text).toContain('Findings: 0 critical, 0 warnings, 18 healthy controls');
    expect(text).not.toContain('Top priorities');
  });
});
