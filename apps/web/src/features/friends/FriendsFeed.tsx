import { ContentLoading } from "../../components/LoadingPatterns";
import { useMinimumLoading } from "../../hooks/useMinimumLoading";
import { useMemo, type ReactNode } from "react";
import { FormattedText } from "../../components/FormattedProse";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { CardReadMore } from "../../components/CardReadMore";
import { PageLoadError } from "../../components/PageLoading";
import { FriendsBirthdays } from "./FriendsBirthdays";
import type { ManualChart } from "../../services/manualCharts";
import type { FriendsFeedFilter } from "./friendsFeedSources";
import { friendsFeedExactToday, groupFriendsFeedCards } from "./friendsFeedTransits";

export type FriendsFeedCard = {
  id: string; friendId: string; source: Exclude<FriendsFeedFilter,"all">; friendName: string; avatarUrl?: string;
  title: string; friendNameStart?: number; body: string; startsAt: string; endsAt: string; exactAt: string[]; orb: string; aspect: string;
  priorityIndex?: number;
  onOpen: () => void;
};

function dayKey(value: string, timeZone: string) {
  return new Date(value).toLocaleDateString("en-CA", { timeZone });
}
function feedTitle(card: FriendsFeedCard) {
  const start = card.friendNameStart;
  if (start === undefined || card.title.slice(start, start + card.friendName.length) !== card.friendName) return card.title;
  return <>{card.title.slice(0, start)}<span className="friends-timing-card__friend-name">{card.friendName}</span>{card.title.slice(start + card.friendName.length)}</>;
}

export function FriendsFeed({ cards, filter, now, timeZone, loading, error, onRetry, charts, chartsLoading, onOpenChart, pairForecast }: {
  cards: FriendsFeedCard[]; filter: FriendsFeedFilter; now: string; timeZone: string;
  loading: boolean; error: boolean; onRetry?: () => void;
  charts: ManualChart[]; chartsLoading: boolean; onOpenChart: (chart: ManualChart) => void;
  pairForecast?: ReactNode;
}) {
  const holding = useMinimumLoading(loading);
  const groups = useMemo(() => {
    return groupFriendsFeedCards(cards.filter(card => filter === "all" || card.source === filter), now, timeZone);
  }, [cards, filter, now, timeZone]);
  const date = (value: string) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
  const metadata = (card: FriendsFeedCard) => {
    const range = dayKey(card.startsAt,timeZone) === dayKey(card.endsAt,timeZone) ? date(card.startsAt) : `${date(card.startsAt)} – ${date(card.endsAt)}`;
    const exact = friendsFeedExactToday(card.exactAt, now, timeZone);
    return exact.length ? `Exact ${exact.map(at => new Date(at).toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" })).join(", ")} · ${range} · Transit`
      : `${range} · ${card.orb} · Transit`;
  };
  return <div className="friends-feed-layout">
    <div className="friends-feed-timeline">
      {pairForecast}
      {error ? <PageLoadError message="The transit readings could not load. Please try again." onRetry={onRetry ?? (() => {})} />
      : holding ? <ContentLoading layout="feed" message="Loading transits…" />
      : groups.length ? groups.map(([label, rows]) => <section className="friends-feed-group" aria-label={label} key={label}>
        <h2>{label}</h2>
        {rows.map(card => <button type="button" className="friends-timing-card" onClick={card.onOpen} key={card.id}>
          <span className="friends-timing-card__avatar"><ProfileAvatar name={card.friendName} email="" avatarUrl={card.avatarUrl} aspect={card.aspect}/></span>
          <span className="friends-timing-card__copy"><strong>{feedTitle(card)}</strong><small>{metadata(card)}</small></span>
          <span className="friends-timing-card__body"><FormattedText text={card.body}/></span>
          <CardReadMore appearance="icon" className="friends-timing-card__arrow" />
        </button>)}
      </section>) : <div className="friends-unified-empty"><h2>{filter === "circle" ? "Your circle’s transits" : filter === "charts" ? "Saved chart transits" : "Transits"}</h2><p>No transit readings are available for this date.</p></div>}
    </div>
    <FriendsBirthdays charts={charts} now={now} timeZone={timeZone} loading={chartsLoading} onOpen={onOpenChart} />
  </div>;
}
