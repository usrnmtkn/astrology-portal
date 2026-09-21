import { astroGlyphFile, astroGlyphHref } from "./astroGlyphMap";

const glyphArrow = (
  <svg aria-hidden="true" className="astro-glyph__arrow" fill="currentColor" viewBox="0 0 256 256">
    <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z" />
  </svg>
);

type GlyphPart =
  | { type: "glyph"; file: string; key: string }
  | { type: "rx"; text: string; key: string }
  | { type: "emoji"; text: string; key: string }
  | { type: "arrow"; key: string }
  | { type: "text"; text: string; key: string };

function parseGlyphText(text: string): GlyphPart[] {
  const chars = Array.from(text.replace(/\uFE0E|\uFE0F/g, ""));
  const parts: GlyphPart[] = [];
  let index = 0;

  while (index < chars.length) {
    const slice3 = chars.slice(index, index + 3).join("");
    const slice2 = chars.slice(index, index + 2).join("");
    const char = chars[index] ?? "";

    if (slice3 === "VOC") {
      parts.push({ type: "rx", text: "VOC", key: `voc-${index}` });
      index += 3;
      continue;
    }
    if (slice2 === "Rx") {
      parts.push({ type: "rx", text: "Rx", key: `rx-${index}` });
      index += 2;
      continue;
    }
    const file = astroGlyphFile(char);
    if (file) {
      parts.push({ type: "glyph", file, key: `${file}-${index}` });
      index += 1;
      continue;
    }
    if (/\p{Extended_Pictographic}/u.test(char)) {
      parts.push({ type: "emoji", text: char, key: `e-${index}` });
      index += 1;
      continue;
    }
    if (char === "→" || char === "➝") {
      parts.push({ type: "arrow", key: `arrow-${index}` });
      index += 1;
      continue;
    }
    if (char === " ") {
      index += 1;
      continue;
    }
    parts.push({ type: "text", text: char, key: `t-${index}` });
    index += 1;
  }

  return parts;
}

export function AstroGlyph({
  text,
  label
}: {
  text: string;
  size?: string;
  label?: string;
}) {
  const parts = parseGlyphText(text);

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className="astro-glyph"
    >
      {parts.map((part) => {
        if (part.type === "glyph") {
          return (
            <span
              className="astro-glyph__mask"
              key={part.key}
              style={{
                maskImage: `url(${astroGlyphHref(part.file)})`,
                WebkitMaskImage: `url(${astroGlyphHref(part.file)})`
              }}
            />
          );
        }
        if (part.type === "rx") {
          return <span className="astro-glyph__rx" key={part.key}>{part.text}</span>;
        }
        if (part.type === "emoji") {
          return <span className="astro-glyph__emoji" key={part.key}>{part.text}</span>;
        }
        if (part.type === "arrow") {
          return <span className="astro-glyph__arrow-wrap" key={part.key}>{glyphArrow}</span>;
        }
        return <span className="astro-glyph__text" key={part.key}>{part.text}</span>;
      })}
    </span>
  );
}
