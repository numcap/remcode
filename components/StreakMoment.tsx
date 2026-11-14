import { useEffect, useRef } from 'react';
import { MILESTONE_LINES, MILESTONES, nextMilestone } from '@/lib/streak';
import type { StreakGain } from './CaptureApp';

const SPARKS = 12;
/** How long the moment stays up before turning into the saved toast. */
const DURATION = 2800;
const DURATION_MILESTONE = 4200;

/**
 * Shown over the problem page right after a solve makes today count:
 * the flame ignites, the count rolls over to the new number, and sparks fly.
 * Click, any key, or the timer moves on.
 */
export function StreakMoment({ gain, onDone }: { gain: StreakGain; onDone: () => void }) {
  const { from, to, milestone } = gain;
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    ref.current?.focus();
    const timer = setTimeout(() => done.current(), milestone ? DURATION_MILESTONE : DURATION);
    return () => clearTimeout(timer);
  }, [milestone]);

  const next = nextMilestone(to);
  const prev = MILESTONES.filter((m) => m <= to).at(-1) ?? 0;
  const prevBefore = MILESTONES.filter((m) => m <= from).at(-1) ?? 0;
  const pct = (n: number, base: number) => (next ? ((n - base) / (next - base)) * 100 : 100);
  // Crossing a milestone restarts the bar, so start it empty instead of sliding backwards.
  const fromPct = prev === prevBefore ? pct(from, prev) : 0;

  return (
    <div
      className="mc-backdrop mc-streak-backdrop"
      style={{ ['--life' as string]: `${milestone ? DURATION_MILESTONE : DURATION}ms` }}
      onClick={() => onDone()}
    >
      <div
        ref={ref}
        className={`mc-streak${milestone ? ' mc-streak-milestone' : ''}`}
        role="status"
        aria-live="polite"
        aria-label={`${to}-day streak`}
        tabIndex={-1}
        onKeyDown={(e) => {
          e.preventDefault();
          onDone();
        }}
      >
        <div className="mc-streak-burst" aria-hidden>
          <span className="mc-streak-ring" />
          {Array.from({ length: SPARKS }, (_, i) => (
            <span
              key={i}
              className="mc-streak-spark"
              style={{ ['--a' as string]: `${(360 / SPARKS) * i + (i % 2) * 12}deg`, ['--d' as string]: `${70 + (i % 3) * 22}px` }}
            />
          ))}
          <span className="mc-streak-flame">🔥</span>
        </div>

        <div className="mc-streak-count" aria-hidden>
          <span className="mc-streak-roll">
            <span>{from}</span>
            <span>{to}</span>
          </span>
        </div>
        <div className="mc-streak-label">{from === 0 ? 'Streak started!' : 'day streak'}</div>

        {milestone ? (
          <div className="mc-streak-trophy">
            <span aria-hidden>🏆</span>
            <div>
              <strong>{milestone}-day milestone!</strong>
              <div>{MILESTONE_LINES[milestone]}</div>
            </div>
          </div>
        ) : (
          next && (
            <div className="mc-streak-next">
              <span className="mc-streak-track">
                <span
                  className="mc-streak-fill"
                  style={{ ['--from' as string]: `${fromPct}%`, ['--to' as string]: `${pct(to, prev)}%` }}
                />
              </span>
              <span>
                {next - to} day{next - to === 1 ? '' : 's'} to {next}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
