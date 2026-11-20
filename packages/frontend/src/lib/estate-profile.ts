import { NOT_APPLICABLE, type AssessmentAnswers } from '@rayfin-app/shared';

/**
 * Short "your estate" profile asked before the questions. Answering "No" marks the
 * linked questions not applicable, so the assessment adapts to how Fabric is used.
 * Every linked question must allow "not applicable".
 */
export const ESTATE_PROFILE = [
  {
    id: 'storage',
    prompt: 'Do you store data in Fabric Lakehouses or Warehouses?',
    help: 'Answer No if you use Fabric only for Power BI reports and semantic models.',
    questionIds: ['platform-data-layers', 'engineering-delta-maintenance'],
  },
  {
    id: 'loads',
    prompt: 'Do you run pipelines, notebooks, dataflows or scheduled data loads in Fabric?',
    help: 'Answer No if data reaches Fabric only through direct connections from reports.',
    questionIds: ['engineering-ingestion', 'observability-pipelines'],
  },
] as const;

export type ProfileAnswer = 'yes' | 'no' | undefined;

/** "no" when every linked question is not applicable; "yes" when any has a score; otherwise unset. */
export function profileAnswer(answers: AssessmentAnswers, questionIds: readonly string[]): ProfileAnswer {
  if (questionIds.every((id) => answers[id] === NOT_APPLICABLE)) return 'no';
  if (questionIds.some((id) => typeof answers[id] === 'number')) return 'yes';
  return undefined;
}
