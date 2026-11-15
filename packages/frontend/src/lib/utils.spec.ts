import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('keeps a custom font size alongside a text colour', () => {
    expect(cn('text-300 leading-300', 'text-muted-foreground')).toBe('text-300 leading-300 text-muted-foreground');
    expect(cn('text-hero-800', 'text-band-critical')).toBe('text-hero-800 text-band-critical');
  });

  it('still resolves conflicting font sizes', () => {
    expect(cn('text-300', 'text-500')).toBe('text-500');
  });
});
