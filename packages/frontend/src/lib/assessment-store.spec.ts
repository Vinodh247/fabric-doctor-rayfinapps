import { QUESTIONS, evaluateAssessment, type AnswerScore } from '@rayfin-app/shared';
import { describe, expect, it } from 'vitest';

import {
  NotSignedInError,
  PAGE_SIZE,
  buildAssessmentRows,
  deleteAssessment,
  listAssessments,
  loadAssessment,
  saveAssessment,
  type DataClient,
} from './assessment-store';

type Row = Record<string, unknown> & { id: string };

/** Minimal in-memory stand-in for the Rayfin data client surface the store uses. */
function fakeClient(options: { signedIn?: boolean; failCreate?: (entity: string, row: Row) => boolean } = {}) {
  const tables: Record<string, Map<string, Row>> = {
    Assessment: new Map(),
    CategoryResult: new Map(),
    Finding: new Map(),
  };

  function entity(name: string) {
    const table = tables[name];
    return {
      async create(row: Row) {
        if (options.failCreate?.(name, row)) throw new Error(`create ${name} failed`);
        table.set(row.id, { ...row });
        return row;
      },
      async delete({ id }: { id: string }) {
        const row = table.get(id);
        table.delete(id);
        return row;
      },
      async findById(id: string) {
        return table.get(id) ?? null;
      },
      select(fields: string[]) {
        let rows = [...table.values()];
        let size = 100;
        let offset = 0;
        const project = (row: Row) => Object.fromEntries(fields.map((f) => [f, row[f]]));
        const builder = {
          where(filter: Record<string, { eq: unknown }>) {
            rows = rows.filter((row) => Object.entries(filter).every(([key, cond]) => row[key] === cond.eq));
            return builder;
          },
          orderBy(order: Record<string, 'asc' | 'desc'>) {
            const [[key, dir]] = Object.entries(order);
            rows.sort((a, b) => {
              const av = a[key] as Date;
              const bv = b[key] as Date;
              return (av < bv ? -1 : av > bv ? 1 : 0) * (dir === 'desc' ? -1 : 1);
            });
            return builder;
          },
          first(n: number) {
            size = n;
            return builder;
          },
          after(cursor: string) {
            offset = Number(cursor);
            return builder;
          },
          async execute() {
            return rows.slice(0, size).map(project);
          },
          async executePaginated() {
            const items = rows.slice(offset, offset + size).map(project);
            const end = offset + items.length;
            return { items, hasNextPage: end < rows.length, endCursor: String(end) };
          },
        };
        return builder;
      },
    };
  }

  const client = {
    auth: {
      getSession: () =>
        options.signedIn === false
          ? { user: null, isAuthenticated: false, isAnonymous: false }
          : { user: { id: 'user-sub-1', email: 'architect@example.com' }, isAuthenticated: true, isAnonymous: false },
    },
    data: { Assessment: entity('Assessment'), CategoryResult: entity('CategoryResult'), Finding: entity('Finding') },
  } as unknown as DataClient;

  return { client, tables };
}

function answersWith(overrides: Record<string, AnswerScore> = {}) {
  return { ...Object.fromEntries(QUESTIONS.map((q, i) => [q.id, (i % 5) as AnswerScore])), ...overrides };
}

const completedAt = new Date('2026-11-15T10:00:00Z');

describe('buildAssessmentRows', () => {
  it('creates one assessment, six category results and one finding per question, all owned by the user', () => {
    const result = evaluateAssessment(answersWith());
    let n = 0;
    const rows = buildAssessmentRows(result, completedAt, { id: 'owner-1', name: 'a@example.com' }, () => `id-${n++}`);

    expect(rows.categories).toHaveLength(6);
    expect(rows.findings).toHaveLength(QUESTIONS.length);
    const all = [rows.assessment, ...rows.categories, ...rows.findings];
    expect(all.every((row) => row.owner_id === 'owner-1')).toBe(true);
    expect([...rows.categories, ...rows.findings].every((row) => row.assessmentId === rows.assessment.id)).toBe(true);
    expect(new Set(all.map((row) => row.id)).size).toBe(all.length);
    expect(rows.assessment).toMatchObject({ overallScore: result.overallScore, overallStatus: result.overallStatus, completedAt });
  });
});

describe('saveAssessment and loadAssessment', () => {
  it('round-trips a result exactly', async () => {
    const { client, tables } = fakeClient();
    const result = evaluateAssessment(answersWith());
    const id = await saveAssessment(client, result, completedAt);

    expect(tables.Assessment.size).toBe(1);
    expect(tables.CategoryResult.size).toBe(6);
    expect(tables.Finding.size).toBe(QUESTIONS.length);

    const loaded = await loadAssessment(client, id);
    expect(loaded.result).toEqual(result);
    expect(loaded.completedAt).toEqual(completedAt);
    expect(loaded.rescored).toBe(false);
  });

  it('accepts dates returned as ISO strings', async () => {
    const { client, tables } = fakeClient();
    const id = await saveAssessment(client, evaluateAssessment(answersWith()), completedAt);
    tables.Assessment.get(id)!.completedAt = completedAt.toISOString();
    expect((await loadAssessment(client, id)).completedAt).toEqual(completedAt);
  });

  it('flags a saved result whose score differs under the current rules', async () => {
    const { client, tables } = fakeClient();
    const id = await saveAssessment(client, evaluateAssessment(answersWith()), completedAt);
    tables.Assessment.get(id)!.overallScore = 1;
    const loaded = await loadAssessment(client, id);
    expect(loaded.rescored).toBe(true);
    expect(loaded.savedScore).toBe(1);
  });

  it('refuses to save when signed out and writes nothing', async () => {
    const { client, tables } = fakeClient({ signedIn: false });
    await expect(saveAssessment(client, evaluateAssessment(answersWith()), completedAt)).rejects.toBeInstanceOf(NotSignedInError);
    expect(tables.Assessment.size).toBe(0);
  });

  it('rolls back every row when a child write fails', async () => {
    const { client, tables } = fakeClient({
      failCreate: (entity, row) => entity === 'Finding' && row.questionId === 'devops-testing',
    });
    await expect(saveAssessment(client, evaluateAssessment(answersWith()), completedAt)).rejects.toThrow('create Finding failed');
    expect(tables.Assessment.size).toBe(0);
    expect(tables.CategoryResult.size).toBe(0);
    expect(tables.Finding.size).toBe(0);
  });
});

describe('listAssessments', () => {
  it('pages through assessments newest first', async () => {
    const { client } = fakeClient();
    const total = PAGE_SIZE + 2;
    for (let day = 1; day <= total; day++) {
      await saveAssessment(client, evaluateAssessment(answersWith()), new Date(Date.UTC(2026, 10, day)));
    }

    const first = await listAssessments(client);
    expect(first.items).toHaveLength(PAGE_SIZE);
    expect(first.items[0].completedAt).toEqual(new Date(Date.UTC(2026, 10, total)));
    expect(first.hasNextPage).toBe(true);

    const second = await listAssessments(client, first.endCursor);
    expect(second.items).toHaveLength(2);
    expect(second.hasNextPage).toBe(false);
  });
});

describe('deleteAssessment', () => {
  it('removes the assessment and all its child rows, leaving others intact', async () => {
    const { client, tables } = fakeClient();
    const keep = await saveAssessment(client, evaluateAssessment(answersWith()), completedAt);
    const remove = await saveAssessment(client, evaluateAssessment(answersWith()), completedAt);

    await deleteAssessment(client, remove);

    expect([...tables.Assessment.keys()]).toEqual([keep]);
    expect([...tables.Finding.values()].every((row) => row.assessmentId === keep)).toBe(true);
    expect(tables.Finding.size).toBe(QUESTIONS.length);
    expect(tables.CategoryResult.size).toBe(6);
  });
});
