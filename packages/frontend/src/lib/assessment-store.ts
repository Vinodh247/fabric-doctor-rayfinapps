import {
  ANSWER_SCORES,
  evaluateAssessment,
  toFindingFields,
  type AnswerScore,
  type AssessmentAnswers,
  type AssessmentEvaluation,
  type AssessmentRecord,
  type CategoryResultRecord,
  type FindingRecord,
  type HealthStatus,
  type UniversalAppSchema,
} from '@rayfin-app/shared';
import type { RayfinClient } from '@microsoft/rayfin-client';

/**
 * Persistence for completed assessments through Rayfin Data.
 *
 * A saved assessment is one Assessment row, one CategoryResult per category
 * and one Finding per question. Every row is stamped with the signed-in user's
 * id in `owner_id`; the entities' `@role` policy restricts reads and writes to
 * that owner on the server.
 *
 * The Data API has no transactions or bulk writes, so saves and deletes run
 * row by row and clean up after themselves on failure.
 */

export type DataClient = Pick<RayfinClient<UniversalAppSchema>, 'auth' | 'data'>;

export interface AssessmentSummary {
  id: string;
  overallScore: number;
  overallStatus: HealthStatus;
  completedAt: Date;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
}

export interface AssessmentPage {
  items: AssessmentSummary[];
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface LoadedAssessment {
  id: string;
  result: AssessmentEvaluation;
  completedAt: Date;
  /** Saved answers re-scored by the current rules. True when that changed the saved score or rating. */
  rescored: boolean;
  savedScore: number;
  savedStatus: string;
}

export class NotSignedInError extends Error {
  constructor() {
    super('You need to be signed in to save or view assessments.');
    this.name = 'NotSignedInError';
  }
}

export const PAGE_SIZE = 10;
const WRITE_CONCURRENCY = 6;

export interface AssessmentRows {
  assessment: AssessmentRecord;
  categories: CategoryResultRecord[];
  findings: FindingRecord[];
}

interface WrittenRow {
  entity: 'Finding' | 'CategoryResult';
  id: string;
}

/** Builds every row for a completed assessment. Pure, so it can be tested without a backend. */
export function buildAssessmentRows(
  result: AssessmentEvaluation,
  completedAt: Date,
  owner: { id: string; name: string },
  newId: () => string = () => crypto.randomUUID(),
): AssessmentRows {
  const assessmentId = newId();
  return {
    assessment: {
      id: assessmentId,
      userName: owner.name.slice(0, 200),
      overallScore: result.overallScore,
      overallStatus: result.overallStatus,
      completedAt,
      criticalCount: result.criticalCount,
      warningCount: result.warningCount,
      healthyCount: result.healthyCount,
      owner_id: owner.id,
    },
    categories: result.categories.map((category) => ({
      id: newId(),
      assessmentId,
      category: category.category,
      score: category.score,
      maximumScore: category.maximumScore,
      status: category.status,
      owner_id: owner.id,
    })),
    findings: result.findings.map((finding) => ({
      id: newId(),
      assessmentId,
      questionId: finding.questionId,
      answerScore: finding.answerScore,
      ...toFindingFields(finding),
      owner_id: owner.id,
    })),
  };
}

/** Recovers the original answers from saved findings (one per question). */
export function answersFromFindings(rows: Pick<FindingRecord, 'questionId' | 'answerScore'>[]): AssessmentAnswers {
  const answers: AssessmentAnswers = {};
  for (const row of rows) {
    if ((ANSWER_SCORES as readonly number[]).includes(row.answerScore)) {
      answers[row.questionId] = row.answerScore as AnswerScore;
    }
  }
  return answers;
}

function currentOwner(client: DataClient): { id: string; name: string } {
  const session = client.auth.getSession();
  if (!session.isAuthenticated || session.isAnonymous || !session.user?.id) {
    throw new NotSignedInError();
  }
  return { id: session.user.id, name: session.user.email ?? '' };
}

/** Runs async tasks with bounded concurrency and reports every outcome. */
async function settleLimited<T>(tasks: (() => Promise<T>)[], limit = WRITE_CONCURRENCY): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await tasks[index]() };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

/** Saves a completed assessment and returns its id. Removes partial writes if any row fails. */
export async function saveAssessment(client: DataClient, result: AssessmentEvaluation, completedAt: Date): Promise<string> {
  const rows = buildAssessmentRows(result, completedAt, currentOwner(client));
  await client.data.Assessment.create(rows.assessment);

  const childWrites: (() => Promise<WrittenRow>)[] = [
    ...rows.categories.map((row) => async (): Promise<WrittenRow> => {
      await client.data.CategoryResult.create(row);
      return { entity: 'CategoryResult', id: row.id };
    }),
    ...rows.findings.map((row) => async (): Promise<WrittenRow> => {
      await client.data.Finding.create(row);
      return { entity: 'Finding', id: row.id };
    }),
  ];
  const outcomes = await settleLimited(childWrites);
  const failure = outcomes.find((o): o is PromiseRejectedResult => o.status === 'rejected');
  if (!failure) {
    return rows.assessment.id;
  }

  // Best-effort rollback so a half-saved assessment never shows up in history.
  const written = outcomes.flatMap((o) => (o.status === 'fulfilled' ? [o.value] : []));
  await settleLimited<unknown>(
    written.map(({ entity, id }) => () =>
      entity === 'Finding' ? client.data.Finding.delete({ id }) : client.data.CategoryResult.delete({ id }),
    ),
  );
  await client.data.Assessment.delete({ id: rows.assessment.id }).catch(() => undefined);
  throw failure.reason;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** One page of the signed-in user's assessments, newest first. */
export async function listAssessments(client: DataClient, after?: string | null): Promise<AssessmentPage> {
  currentOwner(client);
  let query = client.data.Assessment.select([
    'id',
    'overallScore',
    'overallStatus',
    'completedAt',
    'criticalCount',
    'warningCount',
    'healthyCount',
  ])
    .orderBy({ completedAt: 'desc' })
    .first(PAGE_SIZE);
  if (after) {
    query = query.after(after);
  }
  const page = await query.executePaginated();
  return {
    items: page.items.map((row) => ({
      id: row.id,
      overallScore: row.overallScore,
      overallStatus: row.overallStatus as HealthStatus,
      completedAt: toDate(row.completedAt),
      criticalCount: row.criticalCount,
      warningCount: row.warningCount,
      healthyCount: row.healthyCount,
    })),
    hasNextPage: page.hasNextPage,
    endCursor: page.endCursor ?? null,
  };
}

async function findingRows(client: DataClient, assessmentId: string) {
  // Bounded: one finding per question (18), well under one page.
  return client.data.Finding.select(['id', 'questionId', 'answerScore'])
    .where({ assessmentId: { eq: assessmentId } })
    .first(100)
    .execute();
}

/** Loads a saved assessment and rebuilds its full result from the saved answers. */
export async function loadAssessment(client: DataClient, id: string): Promise<LoadedAssessment> {
  currentOwner(client);
  const assessment = await client.data.Assessment.findById(id);
  if (!assessment) {
    throw new Error('This assessment no longer exists.');
  }
  const answers = answersFromFindings(await findingRows(client, id));
  const result = evaluateAssessment(answers);
  return {
    id,
    result,
    completedAt: toDate(assessment.completedAt),
    rescored: result.overallScore !== assessment.overallScore || result.overallStatus !== assessment.overallStatus,
    savedScore: assessment.overallScore,
    savedStatus: assessment.overallStatus,
  };
}

/** Deletes an assessment and its child rows. Children go first so a failure leaves it retryable. */
export async function deleteAssessment(client: DataClient, id: string): Promise<void> {
  currentOwner(client);
  const [findings, categories] = await Promise.all([
    findingRows(client, id),
    client.data.CategoryResult.select(['id']).where({ assessmentId: { eq: id } }).first(100).execute(),
  ]);
  const outcomes = await settleLimited<unknown>([
    ...findings.map((row) => () => client.data.Finding.delete({ id: row.id })),
    ...categories.map((row) => () => client.data.CategoryResult.delete({ id: row.id })),
  ]);
  const failure = outcomes.find((o): o is PromiseRejectedResult => o.status === 'rejected');
  if (failure) {
    throw failure.reason;
  }
  await client.data.Assessment.delete({ id });
}
