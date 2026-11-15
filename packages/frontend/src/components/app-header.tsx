import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/theme.context';
import { cn } from '@/lib/utils';

/** Product mark: a segmented arc echoing the results gauge. */
function DoctorMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className="icon-size-600 shrink-0">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M9 21.5a8.5 8.5 0 0 1 3-11.6" className="stroke-primary-foreground/45" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M14.6 8.6a8.5 8.5 0 0 1 9.9 6.2" className="stroke-primary-foreground/70" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M24.7 18.2a8.5 8.5 0 0 1-1.7 3.3" className="stroke-primary-foreground" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="17" r="2.2" className="fill-primary-foreground" />
    </svg>
  );
}

export type HeaderSection = 'assessment' | 'about';

interface AppHeaderProps {
  current: HeaderSection;
  onHome: () => void;
  onAbout: () => void;
}

export function AppHeader({ current, onHome, onAbout }: AppHeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-400 px-400 md:px-600">
        <button
          type="button"
          onClick={onHome}
          aria-label="Fabric Doctor home"
          className="flex shrink-0 items-center gap-300 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <DoctorMark />
          <span className="hidden flex-col sm:flex">
            <span className="font-heading text-400 leading-400 font-semibold">Fabric Doctor</span>
            <span className="hidden text-200 leading-200 text-muted-foreground lg:block">
              Architecture health check for Microsoft Fabric
            </span>
          </span>
        </button>
        <div className="flex items-center gap-100">
          <nav aria-label="Main" className="flex items-center gap-100">
            {(
              [
                { id: 'assessment', label: 'Assessment', onClick: onHome },
                { id: 'about', label: 'About & guide', onClick: onAbout },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                aria-current={current === item.id ? 'page' : undefined}
                className={cn(
                  'h-9 rounded-lg px-300 text-[length:var(--text-300)] font-semibold whitespace-nowrap transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  current === item.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </div>
    </header>
  );
}
