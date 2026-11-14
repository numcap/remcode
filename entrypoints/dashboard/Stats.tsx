import { useEffect, useMemo, useRef } from 'react';
import { PageSkeleton } from '@/components/Skeleton';
import { startOfDay } from '@/lib/format';
import {
  computeStreak,
  dayKey,
  FREEZE_EVERY,
  MAX_FREEZES,
  MILESTONES,
  nextDayStart,
  nextMilestone,
  perfectDays,
} from '@/lib/streak';
import { useCards, useNow, useSettings } from './hooks';
import { MilestoneCelebration } from './Streak';

const WEEKS = 53;

interface Cell {
  key: string;
  date: number;
  count: number;
  reviews: number;
  solves: number;
  perfect: boolean;
  frozen: boolean;
  future: boolean;
}

function level(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

function cellTitle(c: Cell): string {
  const date = new Date(c.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (c.frozen) return `${date}: missed, covered by a streak freeze`;
  if (!c.count) return `${date}: no practice`;
  const parts = [];
  if (c.reviews) parts.push(`${c.reviews} review${c.reviews === 1 ? '' : 's'}`);
  if (c.solves) parts.push(`${c.solves} solve${c.solves === 1 ? '' : 's'}`);
  return `${date}: ${parts.join(', ')}${c.perfect ? ' · perfect day' : ''}`;
}

export function Stats() {
  const { cards } = useCards();
  const [settings] = useSettings();
  const now = useNow();
  const scroller = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    if (!cards || !settings) return null;
    const streak = computeStreak(cards, now);
    // Start on the Sunday WEEKS-1 weeks before this week's Sunday.
    const start = new Date(startOfDay(now));
    start.setDate(start.getDate() - start.getDay() - (WEEKS - 1) * 7);
    const perfect = perfectDays(cards, start.getTime(), settings.maxReviewsPerDay, now);
    const cells: Cell[] = [];
    const months: { col: number; label: string }[] = [];
    for (let t = start.getTime(), i = 0; i < WEEKS * 7; t = nextDayStart(t), i++) {
      const key = dayKey(t);
      const day = streak.days.get(key);
      const d = new Date(t);
      if (d.getDate() === 1 || i === 0)
        months.push({ col: Math.floor(i / 7), label: d.toLocaleDateString(undefined, { month: 'short' }) });
      cells.push({
        key,
        date: t,
        reviews: day?.reviews ?? 0,
        solves: day?.solves ?? 0,
        count: (day?.reviews ?? 0) + (day?.solves ?? 0),
        perfect: perfect.has(key),
        frozen: streak.frozen.has(key),
        future: t > now,
      });
    }
    // Drop a label that would collide with the next one.
    const spaced = months.filter((m, i) => !months[i + 1] || months[i + 1]!.col - m.col >= 3);
    return { streak, cells, months: spaced, perfectCount: perfect.size };
  }, [cards, settings, now]);

  // Show the most recent weeks first on narrow screens.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [data]);

  if (!data) return <PageSkeleton variant="library" />;
  const { streak, cells, months, perfectCount } = data;
  const next = nextMilestone(streak.current);

  return (
    <div className="stats-page">
      <MilestoneCelebration streak={streak} />
      <header className="stats-hero">
        <div className={`stats-hero-flame${streak.current ? '' : ' is-out'}`} aria-hidden="true">
          🔥
        </div>
        <div>
          <div className="stats-hero-count">
            {streak.current} <span>day streak</span>
          </div>
          <div className="muted">
            {streak.today === 'done' && 'Today counts. See you tomorrow.'}
            {streak.today === 'at-risk' && 'Rate one problem today to keep it going.'}
            {streak.today === 'idle' && 'Rate one problem today to start a streak.'}
            {next && streak.current > 0 && ` ${next - streak.current} to go until ${next}.`}
          </div>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{streak.longest}</div>
          <div className="stat-label">Longest streak</div>
        </div>
        <div className="stat">
          <div className="stat-value stat-ice">
            {streak.freezes}/{MAX_FREEZES}
          </div>
          <div className="stat-label">Streak freezes</div>
        </div>
        <div className="stat">
          <div className="stat-value">{streak.activeDays}</div>
          <div className="stat-label">Days practiced</div>
        </div>
        <div className="stat">
          <div className="stat-value stat-gold">{perfectCount}</div>
          <div className="stat-label">Perfect days this year</div>
        </div>
      </div>

      <section className="panel">
        <h2>Activity</h2>
        <div className="heatmap-scroll" ref={scroller}>
          <div className="heatmap" style={{ ['--weeks' as string]: WEEKS }}>
            <div className="heatmap-months" aria-hidden="true">
              {months.map((m) => (
                <span key={m.col} style={{ gridColumn: m.col + 1 }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div className="heatmap-grid" role="img" aria-label="Practice activity over the last year">
              {cells.map((c) => (
                <span
                  key={c.key}
                  className={[
                    'hm-cell',
                    `hm-${level(c.count)}`,
                    c.perfect && 'hm-perfect',
                    c.frozen && 'hm-frozen',
                    c.future && 'hm-future',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  title={c.future ? undefined : cellTitle(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`hm-cell hm-${l}`} />
          ))}
          <span>More</span>
          <span className="hm-cell hm-2 hm-perfect" /> <span>Perfect day</span>
          <span className="hm-cell hm-frozen" /> <span>Freeze used</span>
        </div>
      </section>

      <section className="panel">
        <h2>Milestones</h2>
        <ul className="milestones">
          {MILESTONES.map((m) => {
            const earned = streak.longest >= m;
            return (
              <li key={m} className={earned ? 'is-earned' : undefined}>
                <span className="milestone-medal" aria-hidden="true">
                  {earned ? '🏆' : '🔒'}
                </span>
                <strong>{m} days</strong>
                <span className="muted">{earned ? 'Earned' : `${m - streak.current} to go`}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel stats-help">
        <h2>How streaks work</h2>
        <ul>
          <li>A day counts when you rate at least one problem: a review here or a solve on LeetCode or NeetCode.</li>
          <li>
            Every {FREEZE_EVERY} days in a row earns a streak freeze (you can hold {MAX_FREEZES}). If you miss a day, a
            freeze covers it automatically.
          </li>
          <li>A perfect day is one where you cleared everything that was due.</li>
          <li>Rating more cards doesn't grow the streak faster. Showing up is what counts.</li>
        </ul>
      </section>
    </div>
  );
}
