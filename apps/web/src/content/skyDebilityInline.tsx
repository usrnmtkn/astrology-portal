import { Fragment, type ReactNode } from "react";
import type { SkyDebilityDisplayPart } from "./skyDebilityPresentation";

/** Shared semantic inline presentation, without HTML injection. */
export function SkyDebilityInline({ parts, renderText, linkPrefix = "", linkTarget }: {
  parts: readonly SkyDebilityDisplayPart[];
  renderText?: (part: SkyDebilityDisplayPart) => ReactNode;
  linkPrefix?: string;
  linkTarget?: "_blank";
}) {
  const node = (part: SkyDebilityDisplayPart, index: number) => <Fragment key={index}>{part.href
    ? <a className="sky-daily-summary__link" href={`${linkPrefix}${part.href}`} target={linkTarget}
        rel={linkTarget ? "noreferrer" : undefined} aria-label={`Read about ${part.text}`}>{part.text}</a>
    : renderText ? renderText(part) : part.text}</Fragment>;
  const groups: { emphasized: boolean; parts: SkyDebilityDisplayPart[] }[] = [];
  for (const part of parts) {
    const emphasized = Boolean(part.emphasized);
    if (groups.at(-1)?.emphasized === emphasized) groups.at(-1)!.parts.push(part);
    else groups.push({ emphasized, parts: [part] });
  }
  return <>{groups.map((group, index) => group.emphasized
    ? <strong key={index} className="type-body-strong" data-testid="effort-count-statement">{group.parts.map(node)}</strong>
    : <Fragment key={index}>{group.parts.map(node)}</Fragment>)}</>;
}
