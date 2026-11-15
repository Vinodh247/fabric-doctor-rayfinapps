import { HEALTH_BANDS, type HealthStatus } from '@rayfin-app/shared';
import { useEffect, useState } from 'react';

import { STATUS_TONE } from '@/lib/tones';
import { cn } from '@/lib/utils';

const SIZE = 240;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2 - 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** The gauge sweeps 270°, opening at the bottom. */
const SWEEP = 0.75 * CIRCUMFERENCE;
const GAP = 3;

/** Band segments from 0 → 100 along the sweep, derived from the engine's bands. */
const SEGMENTS = [...HEALTH_BANDS]
  .sort((a, b) => a.minimum - b.minimum)
  .map((band, index, bands) => ({
    status: band.status,
    from: band.minimum,
    to: index < bands.length - 1 ? bands[index + 1].minimum : 100,
  }));

interface ScoreGaugeProps {
  score: number;
  maximum: number;
  /** Colours the score arc. Pass the final (possibly capped) status. */
  status: HealthStatus;
}

/**
 * Instrument-style gauge: a faint track split into the five health bands, with
 * the score arc drawn over it in the colour of the final rating.
 */
export function ScoreGauge({ score, maximum, status }: ScoreGaugeProps) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const fraction = maximum > 0 ? Math.min(Math.max(score / maximum, 0), 1) : 0;
  const arc = drawn ? SWEEP * fraction : 0;
  const center = SIZE / 2;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-60">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label={`Health score ${score} out of ${maximum}`}>
        <g transform={`rotate(135 ${center} ${center})`} fill="none" strokeWidth={STROKE}>
          {SEGMENTS.map((segment) => {
            const start = (segment.from / 100) * SWEEP;
            const length = ((segment.to - segment.from) / 100) * SWEEP - GAP;
            return (
              <circle
                key={segment.status}
                cx={center}
                cy={center}
                r={RADIUS}
                className={cn(STATUS_TONE[segment.status].stroke, 'opacity-20')}
                strokeDasharray={`${length} ${CIRCUMFERENCE}`}
                strokeDashoffset={-start}
              />
            );
          })}
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            strokeLinecap="round"
            className={cn(STATUS_TONE[status].stroke, 'motion-safe:transition-[stroke-dasharray] motion-safe:duration-1000 motion-safe:ease-out')}
            strokeDasharray={`${arc} ${CIRCUMFERENCE}`}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-numeric text-hero-1000 leading-hero-1000 font-bold tabular-nums">{score}</span>
        <span className="-mt-200 text-300 leading-300 text-muted-foreground">out of {maximum}</span>
      </div>
    </div>
  );
}
