import { useId } from "react";
import "../styles/eight-ball.css";

/** Shared handoff artwork for unavailable links and retryable loading failures. */
export function EightBall({ glyph = "?", className = "" }: { glyph?: string; className?: string }) {
  const id = useId();
  const fill = (name: string) => `url(#${id}-${name})`;
  return <span className={`eight-ball ${className}`} aria-hidden="true"><svg viewBox="0 0 160 172" fill="none">
    <defs>
      <radialGradient id={`${id}-ball`} cx="38%" cy="30%" r="75%"><stop className="eight-ball__shine-color"/><stop offset=".45" className="eight-ball__ball-color"/><stop offset="1" className="eight-ball__edge-color"/></radialGradient>
      <radialGradient id={`${id}-window`} cx="50%" cy="45%" r="60%"><stop className="eight-ball__window-light"/><stop offset="1" className="eight-ball__window-dark"/></radialGradient>
      <linearGradient id={`${id}-triangle`} x1="0" y1="0" x2="0" y2="1"><stop className="eight-ball__triangle-light"/><stop offset="1" className="eight-ball__triangle-dark"/></linearGradient>
      <radialGradient id={`${id}-shine`}><stop className="eight-ball__shine"/><stop offset="1" className="eight-ball__clear"/></radialGradient>
      <radialGradient id={`${id}-shadow`}><stop className="eight-ball__shadow"/><stop offset="1" className="eight-ball__clear"/></radialGradient>
      <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <ellipse cx="80" cy="160" rx="52" ry="8" fill={fill("shadow")}/>
    <g className="eight-ball__shake reader-unavailable__shake">
      <circle cx="80" cy="78" r="72" fill={fill("ball")} className="eight-ball__rim"/>
      <ellipse cx="54" cy="40" rx="24" ry="14" fill={fill("shine")} transform="rotate(-28 54 40)"/>
      <circle cx="80" cy="80" r="33" className="eight-ball__bezel"/>
      <circle cx="80" cy="80" r="28" fill={fill("window")}/>
      <g className="eight-ball__reveal">
        <path d="M62 70H98L80 100Z" className="eight-ball__glow" filter={fill("glow")}/>
        <path d="M62 70H98L80 100Z" fill={fill("triangle")} className="eight-ball__triangle"/>
        <text x="80" y="80" textAnchor="middle" dominantBaseline="central" className="eight-ball__glyph">{glyph}</text>
      </g>
    </g>
  </svg></span>;
}
