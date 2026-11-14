import { startOfDay } from './format';
import type { Card } from './types';

/**
 * Streaks are worked out from the review logs on the cards, never stored, so
 * they sync, export and import along with the deck for free.
 *
 * A day counts when you rated at least one problem (a review or a solve).
 * Every 7 streak days earns a freeze (holding at most MAX_FREEZES); a missed
 * day spends one instead of ending the streak.
 */

export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
export const MILESTONES = [3, 7, 14, 30, 60, 100] as const;
/** What the celebration says for each milestone. */
export const MILESTONE_LINES: Record<number, string> = {
  3: 'Three days in a row. The habit is starting.',
  7: 'A full week. You just earned your first streak freeze.',
  14: 'Two weeks straight. Patterns are starting to stick.',
  30: 'A month of showing up. Most people never get here.',
  60: 'Two months. Recall is becoming second nature.',
  100: 'Triple digits. Remarkable consistency.',
};

/** Local hour after which a streak still waiting on today counts as at risk. */
export const AT_RISK_HOUR = 20;

export interface DayActivity {
  reviews: number;
  solves: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
  /** Freezes in hand right now. */
  freezes: number;
  /** 'done': today already counts. 'at-risk': a streak is alive but today doesn't count yet. 'idle': no streak. */
  today: 'done' | 'at-risk' | 'idle';
  /** Activity per local day, keyed by dayKey(). */
  days: Map<string, DayActivity>;
  /** Missed days a freeze covered. */
  frozen: Set<string>;
  activeDays: number;
}

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Start of the local day after the one `ts` falls in (DST-safe). */
export function nextDayStart(ts: number): number {
  const d = new Date(startOfDay(ts));
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function activityByDay(cards: Card[]): Map<string, DayActivity> {
  const days = new Map<string, DayActivity>();
  for (const card of cards) {
    for (const entry of card.reviewLog) {
      const key = dayKey(entry.at);
      const day = days.get(key) ?? { reviews: 0, solves: 0 };
      if (entry.kind === 'review') day.reviews++;
      else day.solves++;
      days.set(key, day);
    }
  }
  return days;
}

export function computeStreak(cards: Card[], now = Date.now()): StreakInfo {
  const days = activityByDay(cards);
  const frozen = new Set<string>();
  const empty: StreakInfo = { current: 0, longest: 0, freezes: 0, today: 'idle', days, frozen, activeDays: 0 };

  let first = Infinity;
  for (const card of cards) for (const entry of card.reviewLog) first = Math.min(first, entry.at);
  if (first === Infinity || first > now) return empty;

  const todayKey = dayKey(now);
  let current = 0;
  let longest = 0;
  let freezes = 0;
  for (let t = startOfDay(first); t <= now; t = nextDayStart(t)) {
    const key = dayKey(t);
    if (days.has(key)) {
      current++;
      longest = Math.max(longest, current);
      if (current % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    } else if (key === todayKey) {
      // Today isn't over; it can still count.
    } else if (current > 0 && freezes > 0) {
      freezes--;
      frozen.add(key);
    } else {
      current = 0;
      freezes = 0;
    }
  }

  const today = days.has(todayKey) ? 'done' : current > 0 ? 'at-risk' : 'idle';
  return { current, longest, freezes, today, days, frozen, activeDays: days.size };
}

/** True late in the day when a live streak still needs today's practice. */
export function isStreakAtRisk(info: StreakInfo, now = Date.now()): boolean {
  return info.today === 'at-risk' && new Date(now).getHours() >= AT_RISK_HOUR;
}

/**
 * A perfect day: you practiced, and by the end of it nothing was left due
 * (or you hit the daily review cap). Uses the due date stored on each log
 * entry; for a card's latest entry the card's current schedule stands in.
 * Days whose schedule can't be known (entries from before due was logged)
 * aren't perfect.
 */
export function isPerfectDay(cards: Card[], dayStart: number, maxReviewsPerDay = 0): boolean {
  const end = nextDayStart(dayStart);
  const key = dayKey(dayStart);
  let reviews = 0;
  let solves = 0;
  for (const card of cards) {
    for (const entry of card.reviewLog) {
      if (dayKey(entry.at) !== key) continue;
      if (entry.kind === 'review') reviews++;
      else solves++;
    }
  }
  if (!reviews && !solves) return false;
  if (maxReviewsPerDay > 0 && reviews >= maxReviewsPerDay) return true;
  for (const card of cards) {
    const log = card.reviewLog;
    let i = log.length - 1;
    while (i >= 0 && log[i]!.at >= end) i--;
    if (i < 0) continue; // Card didn't exist yet.
    const due = log[i]!.due ?? (i === log.length - 1 ? card.srs.due : undefined);
    // Same rule as isDue: anything scheduled before the day ends was still due that day.
    if (due === undefined || due < end) return false;
  }
  return true;
}

/** Perfect days among those with activity, from `since` on. */
export function perfectDays(cards: Card[], since: number, maxReviewsPerDay = 0, now = Date.now()): Set<string> {
  const days = activityByDay(cards);
  const out = new Set<string>();
  for (let t = startOfDay(since); t <= now; t = nextDayStart(t)) {
    const key = dayKey(t);
    if (days.has(key) && isPerfectDay(cards, t, maxReviewsPerDay)) out.add(key);
  }
  return out;
}

export function nextMilestone(streak: number): number | undefined {
  return MILESTONES.find((m) => m > streak);
}

/** The highest milestone `streak` has reached that's above `celebrated`, if any. */
export function newMilestone(streak: number, celebrated: number): number | undefined {
  const reached = MILESTONES.filter((m) => m <= streak && m > celebrated);
  return reached.at(-1);
}
