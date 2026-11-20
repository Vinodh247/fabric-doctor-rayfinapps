import type { AssessmentEvaluation, Roadmap } from '@rayfin-app/shared';

export const PHASE_LABEL = { 30: 'Next 30 days', 60: 'Days 31–60', 90: 'Days 61–90' } as const;

/** Plain-text roadmap for pasting into a plan, email or backlog. */
export function buildRoadmapText(result: AssessmentEvaluation, roadmap: Roadmap): string {
  const lines = ['Fabric Doctor: 30/60/90-day roadmap', `Today: ${result.overallScore}/100, ${result.overallStatus}`];
  for (const phase of roadmap.phases) {
    lines.push('', `${PHASE_LABEL[phase.phase]} (projected ${phase.projected.overallScore}/100, ${phase.projected.overallStatus})`);
    if (phase.items.length === 0) {
      lines.push('- Nothing scheduled');
    }
    for (const item of phase.items) {
      const severity = item.finding.severity === 'critical' ? 'Critical' : 'Warning';
      lines.push(`- [${severity}] ${item.finding.title} (${item.effort} effort, +${item.impact} ${item.impact === 1 ? 'point' : 'points'})`);
      lines.push(`  ${item.finding.recommendation}`);
      if (item.finding.references[0]) {
        lines.push(`  Docs: ${item.finding.references[0].url}`);
      }
    }
  }
  return lines.join('\n');
}
