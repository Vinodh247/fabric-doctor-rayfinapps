import type { AssessmentEvaluation } from '@rayfin-app/shared';

const SEVERITY_LABEL = { critical: 'Critical', warning: 'Warning', healthy: 'Healthy' } as const;

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Plain-text summary of a result, suitable for pasting into chat, email or a ticket. */
export function buildShareSummary(result: AssessmentEvaluation, completedAt: Date, topCount = 5): string {
  const lines: string[] = [];
  lines.push('Fabric Doctor: architecture health check');
  lines.push(`Completed ${completedAt.toISOString().slice(0, 10)}`);
  lines.push('');

  let overall = `Overall: ${result.overallScore}/${result.maximumScore}, ${result.overallStatus}`;
  if (result.ratingCapped) {
    overall += ` (score alone rates ${result.numericStatus}; capped by ${plural(result.criticalCount, 'critical finding')})`;
  }
  lines.push(overall);
  lines.push(
    `Findings: ${result.criticalCount} critical, ${plural(result.warningCount, 'warning')}, ${plural(result.healthyCount, 'healthy control')}`,
  );
  lines.push('');

  lines.push('Category scores');
  for (const category of result.categories) {
    lines.push(`- ${category.name}: ${category.score}/${category.maximumScore} (${category.status})`);
  }

  const issues = result.findings.filter((f) => f.severity !== 'healthy').slice(0, topCount);
  if (issues.length > 0) {
    lines.push('');
    lines.push('Top priorities');
    issues.forEach((finding, index) => {
      lines.push(`${index + 1}. [${SEVERITY_LABEL[finding.severity]}] ${finding.title}`);
      lines.push(`   ${finding.recommendation}`);
      if (finding.references[0]) {
        lines.push(`   Docs: ${finding.references[0].url}`);
      }
    });
  }

  return lines.join('\n');
}
