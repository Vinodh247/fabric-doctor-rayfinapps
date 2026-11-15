import type { HealthStatus, Severity } from '@rayfin-app/shared';

import { SEVERITY_META, STATUS_TONE } from '@/lib/tones';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, size = 'md' }: { status: HealthStatus; size?: 'sm' | 'md' }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-100 rounded-full font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-200 py-100-nudge text-[length:var(--text-200)]' : 'px-300 py-100 text-[length:var(--text-300)]',
        tone.text,
        tone.bg,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tone.fill)} />
      {status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-100 rounded-md px-200 py-100-nudge text-[length:var(--text-200)] font-semibold whitespace-nowrap',
        meta.text,
        meta.bg,
      )}
    >
      <meta.Icon aria-hidden className="icon-size-100" />
      {meta.label}
    </span>
  );
}
