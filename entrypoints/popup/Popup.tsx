import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { DifficultyPill } from '@/components/DifficultyPill';
import { Logo } from '@/components/Logo';
import { SiteAccessBanner } from '@/components/SiteAccessBanner';
import { daysSinceLabel, dueLabel, sourceName } from '@/lib/format';
import { buildQueue, getAllCards, getSettings, isDue } from '@/lib/storage';
import { computeStreak, type StreakInfo } from '@/lib/streak';
import type { Card } from '@/lib/types';

const RECENT_COUNT = 5;

function openDashboard(hash: string) {
  browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') + hash });
  window.close();
}

export function Popup() {
  const [state, setState] = useState<{ cards: Card[]; queue: Card[] } | null>(null);

  useEffect(() => {
    Promise.all([getAllCards(), getSettings()]).then(([cards, settings]) =>
      setState({ cards, queue: buildQueue(cards, settings) }),
    );
  }, []);

  if (!state) return <div className="popup" />;
  const { cards, queue } = state;
  const recent = [...cards].sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, RECENT_COUNT);
  const next = cards.filter((c) => !isDue(c)).sort((a, b) => a.srs.due - b.srs.due)[0];

  return (
    <div className="popup">
      <header className="popup-header">
        <div className="brand">
          <Logo className="brand-mark" size={24} />
          ReMCode
        </div>
        <button type="button" className="mc-btn mc-btn-ghost" onClick={() => openDashboard('#/settings')}>
          Settings
        </button>
      </header>

      <SiteAccessBanner />

      <section className="due-box">
        <div className="due-number">{queue.length}</div>
        <div className="due-label">{queue.length === 1 ? 'problem due' : 'problems due'}</div>
        <button
          type="button"
          className="mc-btn mc-btn-primary start"
          disabled={!queue.length}
          onClick={() => openDashboard('#/review')}
        >
          Start review
        </button>
        <div className="due-sub">
          {cards.length} in deck
          {!queue.length && next ? ` · next ${dueLabel(next.srs.due)}` : ''}
        </div>
      </section>

      {cards.length > 0 && <StreakRow streak={computeStreak(cards)} hasDue={queue.length > 0} />}

      {recent.length > 0 ? (
        <section>
          <h2>Recently seen</h2>
          <ul className="recent">
            {recent.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => openDashboard(`#/card/${encodeURIComponent(c.id)}`)}>
                  <span className="recent-title">
                    {c.title} <span className="recent-source">{sourceName(c.source)}</span>
                  </span>
                  <DifficultyPill difficulty={c.difficulty} />
                  <span className="recent-when">{daysSinceLabel(c.lastSeenAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="empty">
          Solve a problem on LeetCode or NeetCode. When it's accepted, you'll be asked how hard it was, and it gets added
          to your deck.
        </p>
      )}

      <footer>
        <button type="button" className="mc-btn" onClick={() => openDashboard('#/library')}>
          Open library
        </button>
        <button type="button" className="mc-btn" onClick={() => openDashboard('#/add')}>
          + Add problem
        </button>
      </footer>
    </div>
  );
}

function StreakRow({ streak, hasDue }: { streak: StreakInfo; hasDue: boolean }) {
  const { current, freezes, today } = streak;
  let message: string;
  if (today === 'done') message = `day streak · today counts`;
  else if (today === 'at-risk')
    message = hasDue ? 'Do 1 review today to keep it' : 'Solve or review 1 problem today to keep it';
  else message = 'Rate one problem today to start a streak';

  return (
    <button
      type="button"
      className={`streak-row streak-${today}`}
      onClick={() => openDashboard('#/stats')}
      title="Open stats"
    >
      <span className="streak-flame" aria-hidden="true">
        {current > 0 ? '🔥' : '·'}
      </span>
      {current > 0 && <span className="streak-count">{current}</span>}
      <span className="streak-message">{message}</span>
      {freezes > 0 && (
        <span className="streak-freezes" title={`${freezes} streak freeze${freezes === 1 ? '' : 's'}: covers a missed day`}>
          🧊 {freezes}
        </span>
      )}
    </button>
  );
}
