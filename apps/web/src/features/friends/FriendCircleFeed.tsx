import { ChevronRight } from "lucide-react";

export type FriendCircleFeedCard = {
  label: string;
  title: string;
  body: string;
};

export type FriendCircleFeedChart = {
  id: string;
  initials: string;
};

type FriendCircleFeedProps = {
  cards: FriendCircleFeedCard[];
  fallbackInitials: string;
  isLoading: boolean;
  previewCharts: FriendCircleFeedChart[];
};

export function FriendCircleFeed({
  cards,
  fallbackInitials,
  isLoading,
  previewCharts
}: FriendCircleFeedProps) {
  return (
    <section className="friends-feed-preview friends-feed-view" aria-label="Circle feed">
      <div className="friends-circle-strip" aria-label={isLoading ? "Loading circle feed" : "Circle feed"}>
        {isLoading ? (
          [0, 1, 2].map((index) => (
            <article className="friends-feed-card friends-feed-card-loading" key={`circle-loading-${index}`} aria-hidden="true">
              <span className="friends-feed-avatar-stack">
                <span className="friends-feed-avatar friends-feed-avatar-skeleton" />
                <span className="friends-feed-avatar friends-feed-avatar-skeleton" />
              </span>
              <span className="friends-feed-card-body">
                <span className="friends-card-skeleton friends-card-skeleton-label" />
                <i className="friends-card-skeleton friends-card-skeleton-title" />
                <i className="friends-card-skeleton friends-card-skeleton-line" />
                <i className="friends-card-skeleton friends-card-skeleton-line friends-card-skeleton-line-short" />
              </span>
              <span className="friends-card-skeleton friends-card-skeleton-chevron" />
            </article>
          ))
        ) : (
          cards.map((card, index) => {
            const feedMeta = index === 0
              ? "Today"
              : index === 1
                ? "This week"
                : card.label === "Friend update"
                  ? "Friend update · 2 days ago"
                  : `${index + 2} days ago`;

            return (
              <article className="friends-feed-card" key={card.title}>
                <span className="friends-feed-avatar-stack" aria-hidden="true">
                  {previewCharts.map((chart) => (
                    <span className="friends-feed-avatar" key={chart.id}>
                      {chart.initials}
                    </span>
                  ))}
                  {previewCharts.length === 0 && (
                    <span className="friends-feed-avatar">
                      {fallbackInitials}
                    </span>
                  )}
                </span>
                <span className="friends-feed-card-body">
                  <span className="friends-feed-meta">{feedMeta}</span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  {index === 0 && (
                    <span className="friends-feed-symbols" aria-label="Aspect symbols">
                      <span>☽</span>
                      <span>∗</span>
                      <span>☿</span>
                    </span>
                  )}
                </span>
                <ChevronRight className="friends-feed-chevron" size={24} aria-hidden="true" />
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
