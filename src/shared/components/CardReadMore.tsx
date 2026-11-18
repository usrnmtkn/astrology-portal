import { ChevronRight } from "lucide-react";

/** Visible cue inside a card's existing link or button; never a nested control. */
export function CardReadMore({ appearance = "text", className = "" }: { appearance?: "text" | "icon"; className?: string } = {}) {
  return appearance === "icon"
    ? <span className={`card-read-more card-read-more--icon ${className}`} aria-hidden="true"><ChevronRight size={18} /></span>
    : <span className={`card-read-more ${className}`}>Read More</span>;
}
