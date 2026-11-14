import { describe, expect, it } from 'vitest';
import { newSrsState } from '@/lib/srs';
import {
  computeStreak,
  dayKey,
  isPerfectDay,
  isStreakAtRisk,
  newMilestone,
  nextMilestone,
  perfectDays,
} from '@/lib/streak';
import type { Card, ReviewEntry } from '@/lib/types';

/** Noon on 2026-10-{day}, local time. */
const on = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();
const DAY = 86_400_000;

function card(slug: string, log: ReviewEntry[], due = on(28)): Card {
  return {
    source: 'leetcode',
    slug,
    id: `leetcode:${slug}`,
    title: slug,
    url: '',
    difficulty: 'Medium',
    tags: [],
    descriptionHtml: '',
    notes: '',
    submissions: [],
    srs: { ...newSrsState(new Date(on(1))), due },
    reviewLog: log,
    createdAt: log[0]?.at ?? on(1),
    lastSeenAt: log.at(-1)?.at ?? on(1),
  };
}

const review = (at: number, due?: number): ReviewEntry => ({ at, rating: 3, kind: 'review', due });
/** One card reviewed once on each of the given October days. */
const practicedOn = (...days: number[]) => [card('a', days.map((d) => review(on(d))))];

describe('computeStreak', () => {
  it('is empty with no history', () => {
    expect(computeStreak([], on(5))).toMatchObject({ current: 0, longest: 0, freezes: 0, today: 'idle' });
  });

  it('counts consecutive days including today', () => {
    const s = computeStreak(practicedOn(1, 2, 3), on(3, 18));
    expect(s).toMatchObject({ current: 3, longest: 3, today: 'done', activeDays: 3 });
  });

  it('keeps the streak alive but at risk until today is over', () => {
    const s = computeStreak(practicedOn(1, 2, 3), on(4, 9));
    expect(s).toMatchObject({ current: 3, today: 'at-risk' });
    expect(isStreakAtRisk(s, on(4, 9))).toBe(false);
    expect(isStreakAtRisk(s, on(4, 21))).toBe(true);
  });

  it('breaks after a missed day with no freezes', () => {
    const s = computeStreak(practicedOn(1, 2, 3, 5), on(5));
    expect(s).toMatchObject({ current: 1, longest: 3, freezes: 0 });
  });

  it('counts solves and multiple cards on the same day once', () => {
    const cards = [
      card('a', [review(on(1)), { at: on(1, 15), rating: 2, kind: 'solve' }]),
      card('b', [{ at: on(2), rating: 4, kind: 'solve' }]),
    ];
    const s = computeStreak(cards, on(2));
    expect(s.current).toBe(2);
    expect(s.days.get(dayKey(on(1)))).toEqual({ reviews: 1, solves: 1 });
  });

  it('earns a freeze every 7 days and spends it on a missed day', () => {
    const week = [1, 2, 3, 4, 5, 6, 7];
    expect(computeStreak(practicedOn(...week), on(7)).freezes).toBe(1);
    const s = computeStreak(practicedOn(...week, 9), on(9));
    expect(s).toMatchObject({ current: 8, freezes: 0 });
    expect([...s.frozen]).toEqual([dayKey(on(8))]);
  });

  it('caps freezes and breaks once they run out', () => {
    const days = Array.from({ length: 21 }, (_, i) => i + 1);
    expect(computeStreak(practicedOn(...days), on(21)).freezes).toBe(2);
    // Days 22 and 23 use both freezes, 24 breaks it.
    const s = computeStreak(practicedOn(...days, 25), on(25));
    expect(s).toMatchObject({ current: 1, longest: 21, freezes: 0 });
    expect(s.frozen.size).toBe(2);
  });

  it('stays correct across a DST change', () => {
    // Europe and US both change clocks within these weeks; streak days are calendar days either way.
    const days = Array.from({ length: 20 }, (_, i) => new Date(2026, 9, 20 + i, 12).getTime());
    const s = computeStreak([card('a', days.map((t) => review(t)))], days.at(-1)!);
    expect(s.current).toBe(20);
  });
});

describe('perfect days', () => {
  it('is perfect when nothing is left due at the end of the day', () => {
    const cards = [card('a', [review(on(3), on(6))]), card('b', [review(on(3), on(5))], on(5))];
    expect(isPerfectDay(cards, on(3, 0))).toBe(true);
  });

  it('is not perfect when a card was left due that day', () => {
    const cards = [card('a', [review(on(3), on(6))]), card('b', [review(on(1), on(3))], on(3))];
    expect(isPerfectDay(cards, on(3, 0))).toBe(false);
  });

  it('uses the due logged on later-replaced entries', () => {
    // b was due on the 3rd, not reviewed then, reviewed on the 4th: day 3 was not perfect.
    const b = card('b', [review(on(1), on(3)), review(on(4), on(9))], on(9));
    const a = card('a', [review(on(3), on(6))]);
    expect(isPerfectDay([a, b], on(3, 0))).toBe(false);
    // Day 4 caught up: b was reviewed and a isn't due until the 6th.
    expect(isPerfectDay([a, b], on(4, 0))).toBe(true);
  });

  it('counts hitting the daily cap as perfect', () => {
    const cards = [card('a', [review(on(3), on(6))]), card('b', [review(on(1), on(3))], on(3))];
    expect(isPerfectDay(cards, on(3, 0), 1)).toBe(true);
  });

  it('is never perfect without activity or with unknown history', () => {
    expect(isPerfectDay([card('a', [review(on(3), on(9))])], on(4, 0))).toBe(false);
    const legacy = card('a', [review(on(1)), review(on(3), on(9))], on(9));
    expect(isPerfectDay([legacy], on(1, 0))).toBe(false);
  });

  it('lists perfect days in a range', () => {
    const cards = [card('a', [review(on(1), on(2)), review(on(2), on(5))], on(5))];
    expect([...perfectDays(cards, on(1), 0, on(3))]).toEqual([dayKey(on(1)), dayKey(on(2))]);
    expect(on(3) - on(2)).toBe(DAY);
  });
});

describe('milestones', () => {
  it('finds the next goal', () => {
    expect(nextMilestone(0)).toBe(3);
    expect(nextMilestone(3)).toBe(7);
    expect(nextMilestone(20)).toBe(30);
    expect(nextMilestone(100)).toBeUndefined();
  });

  it('celebrates only new highs', () => {
    expect(newMilestone(2, 0)).toBeUndefined();
    expect(newMilestone(3, 0)).toBe(3);
    expect(newMilestone(6, 3)).toBeUndefined();
    expect(newMilestone(7, 3)).toBe(7);
    expect(newMilestone(8, 7)).toBeUndefined();
    expect(newMilestone(31, 0)).toBe(30);
    expect(newMilestone(7, 30)).toBeUndefined();
  });
});
