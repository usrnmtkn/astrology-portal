import { FormattedProse } from "../../components/FormattedProse";

/** Change the presentation of the complete CMS passage without rewriting it. */
export function FriendProfileForecast({ eyebrow, body, headline, ariaLabel, children }: {
  eyebrow: string;
  body: string;
  headline?: string | null;
  ariaLabel: string;
  children?: import("react").ReactNode;
}) {
  const sentence = !headline ? /^([\s\S]*?[.!?])(?=\s|$)([\s\S]*)$/u.exec(body) : null;
  const lead = headline || sentence?.[1] || body;
  const rest = headline ? body : sentence?.[2] ?? "";
  return <section className="friend-profile-overview friend-daily-forecast" aria-label={ariaLabel}>
    <span className="friend-profile-eyebrow">{eyebrow}</span>
    <FormattedProse className="friend-profile-overview__headline" text={lead} />
    {rest ? <FormattedProse className="friend-profile-overview__body" text={rest} /> : null}
    {children}
  </section>;
}
