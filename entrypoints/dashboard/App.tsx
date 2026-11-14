import { useEffect } from 'react';
import { browser } from 'wxt/browser';
import { Logo } from '@/components/Logo';
import { SiteAccessBanner } from '@/components/SiteAccessBanner';
import { buildQueue } from '@/lib/storage';
import { computeStreak } from '@/lib/streak';
import { AddProblem } from './AddProblem';
import { CardDetail } from './CardDetail';
import { useCards, useNow, useRoute, useSettings } from './hooks';
import { Library } from './Library';
import { Review } from './Review';
import { SettingsPage } from './SettingsPage';
import { Stats } from './Stats';

export function App() {
  const route = useRoute();
  const { cards } = useCards();
  const [settings] = useSettings();
  const now = useNow();
  const dueCount = cards && settings ? buildQueue(cards, settings, now).length : 0;
  const streak = cards ? computeStreak(cards, now) : null;

  useEffect(() => {
    document.title = dueCount ? `(${dueCount}) ReMCode` : 'ReMCode';
  }, [dueCount]);

  // Pull what other browsers did before you start reviewing. No-op if sync isn't set up.
  useEffect(() => {
    browser.runtime.sendMessage({ type: 'sync-now' }).catch(() => {});
  }, []);

  const reviewCard = route.name === 'review' ? route.query.get('card') : null;

  return (
    <div className="app">
      <nav className="topnav">
        <a href="#/review" className="brand">
          <Logo className="brand-mark" size={26} />
          <span className="brand-text">ReMCode</span>
        </a>
        <div className="nav-links">
          <a href="#/review" aria-current={route.name === 'review' ? 'page' : undefined}>
            Review{dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
          </a>
          <a
            href="#/library"
            aria-current={route.name === 'library' || route.name === 'card' ? 'page' : undefined}
          >
            Library
          </a>
          <a
            href="#/stats"
            className={streak?.current ? 'nav-stats has-streak' : 'nav-stats'}
            aria-current={route.name === 'stats' ? 'page' : undefined}
            title={streak?.current ? `${streak.current}-day streak` : 'Stats'}
          >
            <span className="nav-stats-label">Stats</span>
            {!!streak?.current && (
              <span className={`nav-streak${streak.today === 'at-risk' ? ' is-at-risk' : ''}`}>🔥{streak.current}</span>
            )}
          </a>
          <a href="#/settings" aria-current={route.name === 'settings' ? 'page' : undefined}>
            Settings
          </a>
          <a
            href="#/add"
            className="mc-btn mc-btn-primary nav-add"
            aria-current={route.name === 'add' ? 'page' : undefined}
            title="Add a problem"
            aria-label="Add a problem"
          >
            +<span className="nav-add-text"> Add</span>
          </a>
        </div>
      </nav>
      <main className="content">
        <SiteAccessBanner />
        {route.name === 'review' && <Review key={reviewCard ?? 'due'} cardParam={reviewCard} />}
        {route.name === 'library' && <Library />}
        {route.name === 'card' && route.param && <CardDetail id={route.param} />}
        {route.name === 'settings' && <SettingsPage />}
        {route.name === 'add' && <AddProblem />}
        {route.name === 'stats' && <Stats />}
      </main>
    </div>
  );
}
