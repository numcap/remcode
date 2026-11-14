import { useEffect, useRef, useState } from 'react';
import { getCelebratedMilestone, setCelebratedMilestone } from '@/lib/storage';
import { MAX_FREEZES, MILESTONE_LINES, MILESTONES, newMilestone, nextMilestone, type StreakInfo } from '@/lib/streak';

/** Big flame with the streak count, shown when a review session ends. */
export function StreakReward({ streak, perfect }: { streak: StreakInfo; perfect: boolean }) {
  const { current, freezes } = streak;
  if (current === 0) return null;
  const next = nextMilestone(current);
  const prev = MILESTONES.filter((m) => m <= current).at(-1) ?? 0;
  return (
    <div className={`streak-reward${perfect ? ' streak-reward-perfect' : ''}`}>
      <div className="streak-reward-flame" aria-hidden="true">
        🔥
      </div>
      <div className="streak-reward-count">{current}</div>
      <div className="streak-reward-label">
        day streak{perfect && <span className="perfect-chip">Perfect day</span>}
      </div>
      {next && (
        <div className="streak-progress" title={`${next - current} more to the ${next}-day milestone`}>
          <div className="streak-progress-track">
            <div className="streak-progress-fill" style={{ width: `${((current - prev) / (next - prev)) * 100}%` }} />
          </div>
          <span>
            {next - current} day{next - current === 1 ? '' : 's'} to {next}
          </span>
        </div>
      )}
      <div className="streak-reward-sub">
        🧊 {freezes}/{MAX_FREEZES} freezes · <a href="#/stats">See your stats</a>
      </div>
    </div>
  );
}

/** One-time banner when today's streak crosses a milestone not celebrated before. */
export function MilestoneCelebration({ streak }: { streak: StreakInfo }) {
  const [milestone, setMilestone] = useState<number>();
  const checked = useRef(false);
  const { current, today } = streak;

  useEffect(() => {
    if (checked.current || today !== 'done') return;
    checked.current = true;
    getCelebratedMilestone().then((celebrated) => {
      const m = newMilestone(current, celebrated);
      if (!m) return;
      setMilestone(m);
      setCelebratedMilestone(m);
    });
  }, [current, today]);

  if (!milestone) return null;
  return (
    <div className="milestone-banner" role="status">
      <span className="milestone-trophy" aria-hidden="true">
        🏆
      </span>
      <div>
        <strong>{milestone}-day streak!</strong>
        <div>{MILESTONE_LINES[milestone]}</div>
      </div>
      <button type="button" className="link-button" onClick={() => setMilestone(undefined)} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
