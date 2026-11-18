import { FormattedProse } from "../../components/FormattedProse";

/** Change the presentation of the complete CMS passage without rewriting it. */
export function FriendProfileForecast({ eyebrow, body, headline, opening, ariaLabel, className, children }: {
  eyebrow: string;
  body: string;
  headline?: string | null;
  opening?: string;
  ariaLabel: string;
  className?: string;
  children?: import("react").ReactNode;
}) {
  const completeOpening = opening && body.startsWith(opening) ? opening : null;
  const sentence = !headline && !completeOpening ? /^([\s\S]*?[.!?])(?=\s|$)([\s\S]*)$/u.exec(body) : null;
  const lead = headline || completeOpening || sentence?.[1] || body;
  const rest = headline ? body : completeOpening ? body.slice(completeOpening.length) : sentence?.[2] ?? "";
  return <section className={`friend-profile-overview friend-daily-forecast${className ? ` ${className}` : ""}`} aria-label={ariaLabel}>
    <span className="friend-profile-eyebrow">{eyebrow}</span>
    <FormattedProse className="friend-profile-overview__headline" text={lead} />
    {rest ? <FormattedProse className="friend-profile-overview__body" text={rest} /> : null}
    {children}
  </section>;
}
