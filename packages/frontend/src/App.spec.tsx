import { CATEGORIES, QUESTIONS } from '@rayfin-app/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App';

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

function answerCurrentStep(labelFor: (optionIndex: number) => number) {
  const groups = screen.getAllByRole('group').filter((g) => g.tagName === 'FIELDSET');
  groups.forEach((group, index) => {
    const radios = within(group).getAllByRole('radio');
    fireEvent.click(radios[labelFor(index)]);
  });
}

describe('App', () => {
  it('opens on the welcome screen', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Architecture health check for Microsoft Fabric' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Start assessment/ })).toBeEnabled();
  });

  it('blocks progress until every question in a step is answered', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Start assessment/ }));
    expect(screen.getByRole('heading', { level: 1, name: CATEGORIES[0].name })).toBeVisible();

    const next = screen.getByRole('button', { name: new RegExp(`Next: ${CATEGORIES[1].name}`) });
    expect(next).toBeDisabled();
    answerCurrentStep(() => 3);
    expect(next).toBeEnabled();
  });

  it('walks through all six steps to a scored result', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Start assessment/ }));

    for (let step = 0; step < CATEGORIES.length; step++) {
      // Answer "4 · Mature" everywhere except the first security question (score 0, critical).
      answerCurrentStep((index) => (CATEGORIES[step].id === 'security' && index === 0 ? 0 : 4));
      if (step < CATEGORIES.length - 1) {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`Next: ${CATEGORIES[step + 1].name}`) }));
      }
    }

    fireEvent.click(screen.getByRole('button', { name: /See results/ }));

    expect(screen.getByRole('img', { name: 'Health score 95 out of 100' })).toBeVisible();
    expect(screen.getByText(/caps the rating at/)).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Needs Attention' })).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: `Findings (${QUESTIONS.length})` }));
    fireEvent.click(screen.getByRole('button', { name: /^Critical/ }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 3, name: 'Workspace access is over-privileged' })).toBeVisible();
  });
});
