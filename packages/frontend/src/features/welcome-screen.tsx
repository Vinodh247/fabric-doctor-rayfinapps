import { CATEGORIES, HEALTH_BANDS, QUESTIONS } from '@rayfin-app/shared';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { HistoryPanel } from '@/features/history-panel';
import { CATEGORY_ICONS, STATUS_TONE } from '@/lib/tones';

const BAND_RANGES = HEALTH_BANDS.map((band, index) => ({
  status: band.status,
  range: index === 0 ? `${band.minimum}–100` : `${band.minimum}–${HEALTH_BANDS[index - 1].minimum - 1}`,
}));

export function WelcomeScreen({ onStart, onOpen }: { onStart: () => void; onOpen: (id: string) => void }) {
  return (
    <>
    <div className="grid grid-cols-1 gap-800 py-800 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-800">
      <section className="flex flex-col gap-600">
        <span className="w-fit rounded-full bg-accent px-300 py-100 text-200 leading-200 font-semibold tracking-wide text-accent-foreground uppercase">
          Architecture review · {QUESTIONS.length} questions · about 8 minutes
        </span>
        <h1 className="font-heading text-hero-800 leading-hero-800 font-bold tracking-tight md:text-hero-900 md:leading-hero-900">
          Architecture health check for Microsoft Fabric
        </h1>
        <p className="max-w-xl text-400 leading-400 text-muted-foreground">
          Answer questions about how your Fabric estate is built and run. Fabric Doctor scores six architecture
          disciplines, flags anti-patterns by severity and gives you a prioritised list of recommendations.
        </p>
        <div className="flex flex-wrap items-center gap-400">
          <Button size="lg" onClick={onStart}>
            Start assessment
            <ArrowRight />
          </Button>
          <span className="text-300 leading-300 text-muted-foreground">Results are saved privately to your account.</span>
        </div>

        <div className="mt-200 flex flex-col gap-200">
          <span className="text-200 leading-200 font-semibold tracking-wide text-muted-foreground uppercase">Health bands</span>
          <div className="flex flex-wrap gap-200">
            {[...BAND_RANGES].reverse().map(({ status, range }) => (
              <span key={status} className="flex items-center gap-200 rounded-md border border-border bg-card px-200 py-100 text-200 leading-200">
                <span aria-hidden className={`h-2 w-2 rounded-full ${STATUS_TONE[status].fill}`} />
                <span className="font-semibold">{status}</span>
                <span className="font-numeric text-muted-foreground tabular-nums">{range}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="What is assessed" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-baseline justify-between border-b border-border px-600 py-400">
          <h2 className="text-400 leading-400 font-semibold">What is assessed</h2>
          <span className="text-200 leading-200 text-muted-foreground">Weight</span>
        </div>
        <ul>
          {CATEGORIES.map((category, index) => {
            const Icon = CATEGORY_ICONS[category.id];
            return (
              <li
                key={category.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className="flex items-center gap-400 border-b border-border px-600 py-400 last:border-b-0 motion-safe:animate-[fd-rise_480ms_ease-out_both]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon aria-hidden className="icon-size-300" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-300 leading-300 font-semibold">{category.name}</span>
                  <span className="text-200 leading-200 text-muted-foreground">{category.description}</span>
                </span>
                <span className="font-numeric text-400 leading-400 font-semibold tabular-nums">{category.maximumScore}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
    <HistoryPanel onOpen={onOpen} />
    </>
  );
}
