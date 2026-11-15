import { CATEGORIES, QUESTIONS, evaluateAssessment, type AnswerScore } from '@rayfin-app/shared';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssessmentPage } from '@/lib/assessment-store';

const store = vi.hoisted(() => ({
  saveAssessment: vi.fn(),
  listAssessments: vi.fn(),
  loadAssessment: vi.fn(),
  deleteAssessment: vi.fn(),
}));

vi.mock('@/lib/assessment-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/assessment-store')>()),
  ...store,
}));

vi.mock('@/lib/rayfin-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rayfin-client')>()),
  getRayfinClient: vi.fn(async () => ({})),
}));

import App from '@/App';

const emptyPage: AssessmentPage = { items: [], hasNextPage: false, endCursor: null };

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  store.listAssessments.mockResolvedValue(emptyPage);
  store.saveAssessment.mockResolvedValue('saved-id');
  store.deleteAssessment.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function answerCurrentStep(choose: (questionIndex: number) => number) {
  const groups = screen.getAllByRole('group').filter((g) => g.tagName === 'FIELDSET');
  groups.forEach((group, index) => {
    fireEvent.click(within(group).getAllByRole('radio')[choose(index)]);
  });
}

/** Answers "Mature" everywhere except the first security question (critical). */
function completeAssessment() {
  fireEvent.click(screen.getByRole('button', { name: /Start assessment/ }));
  for (let step = 0; step < CATEGORIES.length; step++) {
    answerCurrentStep((index) => (CATEGORIES[step].id === 'security' && index === 0 ? 0 : 4));
    if (step < CATEGORIES.length - 1) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Next: ${CATEGORIES[step + 1].name}`) }));
    }
  }
  fireEvent.click(screen.getByRole('button', { name: /See results/ }));
}

describe('App', () => {
  it('opens on the welcome screen with an empty history', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Architecture health check for Microsoft Fabric' })).toBeVisible();
    expect(await screen.findByText(/No saved assessments yet/)).toBeVisible();
  });

  it('blocks progress until every question in a step is answered', async () => {
    render(<App />);
    await screen.findByText(/No saved assessments yet/);
    fireEvent.click(screen.getByRole('button', { name: /Start assessment/ }));
    const next = screen.getByRole('button', { name: new RegExp(`Next: ${CATEGORIES[1].name}`) });
    expect(next).toBeDisabled();
    answerCurrentStep(() => 3);
    expect(next).toBeEnabled();
  });

  it('scores a completed assessment and saves it automatically', async () => {
    render(<App />);
    await screen.findByText(/No saved assessments yet/);
    completeAssessment();

    expect(screen.getByRole('img', { name: 'Health score 95 out of 100' })).toBeVisible();
    expect(screen.getByText(/caps the rating at/)).toBeVisible();
    expect(await screen.findByText('Saved to your account')).toBeVisible();
    expect(store.saveAssessment).toHaveBeenCalledTimes(1);
    expect(store.saveAssessment.mock.calls[0][1]).toMatchObject({ overallScore: 95, overallStatus: 'Needs Attention' });

    fireEvent.click(screen.getByRole('tab', { name: `Findings (${QUESTIONS.length})` }));
    fireEvent.click(screen.getByRole('button', { name: /^Critical/ }));
    expect(screen.getAllByRole('article')).toHaveLength(1);

    const doc = screen.getByRole('link', { name: /Roles in workspaces in Microsoft Fabric/ });
    expect(doc).toHaveAttribute('href', 'https://learn.microsoft.com/fabric/fundamentals/roles-workspaces');
    expect(doc).toHaveAttribute('target', '_blank');
    expect(doc).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('explains the app on the About & guide page with live-scored examples', async () => {
    render(<App />);
    await screen.findByText(/No saved assessments yet/);
    fireEvent.click(screen.getByRole('button', { name: 'About & guide' }));

    expect(screen.getByRole('heading', { level: 1, name: 'How Fabric Doctor works' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'About & guide' })).toHaveAttribute('aria-current', 'page');
    const examples = screen.getByRole('region', { name: 'Worked examples' });
    for (const score of ['74', '52', '95']) {
      expect(within(examples).getByText(score)).toBeVisible();
    }
    expect(within(examples).getByText('Score alone:')).toBeVisible();

    fireEvent.click(screen.getAllByRole('button', { name: /Start assessment/ }).at(-1)!);
    expect(screen.getByRole('heading', { level: 1, name: CATEGORIES[0].name })).toBeVisible();
  });

  it('keeps the result on screen when saving fails and lets the user retry', async () => {
    store.saveAssessment.mockRejectedValueOnce(new Error('network down'));
    render(<App />);
    await screen.findByText(/No saved assessments yet/);
    completeAssessment();

    expect(await screen.findByText(/Not saved\. Couldn't save this assessment/)).toBeVisible();
    expect(screen.queryByText(/network down/)).toBeNull();
    expect(screen.getByRole('img', { name: 'Health score 95 out of 100' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Saved to your account')).toBeVisible();
    expect(store.saveAssessment).toHaveBeenCalledTimes(2);
  });

  it('opens a saved assessment from history', async () => {
    const answers = Object.fromEntries(QUESTIONS.map((q) => [q.id, 3 as AnswerScore]));
    const result = evaluateAssessment(answers);
    const completedAt = new Date('2026-11-01T09:30:00Z');
    store.listAssessments.mockResolvedValue({
      items: [{ id: 'a1', overallScore: result.overallScore, overallStatus: result.overallStatus, completedAt, criticalCount: 0, warningCount: 0, healthyCount: 18 }],
      hasNextPage: false,
      endCursor: null,
    });
    store.loadAssessment.mockResolvedValue({ id: 'a1', result, completedAt, rescored: false, savedScore: result.overallScore, savedStatus: result.overallStatus });

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Open/ }));

    expect(await screen.findByRole('img', { name: `Health score ${result.overallScore} out of 100` })).toBeVisible();
    expect(screen.getByText('Saved to your account')).toBeVisible();
    expect(store.loadAssessment).toHaveBeenCalledWith(expect.anything(), 'a1');
    expect(store.saveAssessment).not.toHaveBeenCalled();
  });

  it('deletes a saved assessment only after confirmation', async () => {
    store.listAssessments.mockResolvedValue({
      items: [{ id: 'a1', overallScore: 74, overallStatus: 'Healthy', completedAt: new Date('2026-11-01T09:30:00Z'), criticalCount: 0, warningCount: 3, healthyCount: 15 }],
      hasNextPage: false,
      endCursor: null,
    });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Delete assessment from/ }));
    expect(store.deleteAssessment).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });
    expect(store.deleteAssessment).toHaveBeenCalledWith(expect.anything(), 'a1');
    await waitFor(() => expect(screen.queryByRole('button', { name: /Open/ })).toBeNull());
  });

  it('shows an actionable error when history cannot load', async () => {
    store.listAssessments.mockRejectedValueOnce(new Error('boom'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your saved assessments");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/No saved assessments yet/)).toBeVisible();
  });
});
