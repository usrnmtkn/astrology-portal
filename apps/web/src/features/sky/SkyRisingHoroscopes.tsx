import { ChevronDown } from "lucide-react";
import { readerFacingParagraphs } from "../../content/readerSafety";
import { zodiacSigns } from "../../services/chartMath";

export type SkyRisingHoroscope = {
  risingSign?: string | null;
  house?: number;
  body: string;
  contentKey?: string;
};

type SkyRisingHoroscopesProps = {
  activeRisingSign?: string | null;
  entries?: SkyRisingHoroscope[];
};

function normalizedSign(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function completeSkyRisingHoroscopeSet(entries?: SkyRisingHoroscope[]) {
  if (!entries || entries.length !== zodiacSigns.length) {
    return [];
  }

  const bySign = new Map(entries.map((entry) => [normalizedSign(entry.risingSign), entry]));

  if (bySign.size !== zodiacSigns.length || zodiacSigns.some((sign) => !bySign.has(normalizedSign(sign)))) {
    return [];
  }

  return zodiacSigns.map((sign) => bySign.get(normalizedSign(sign)) as SkyRisingHoroscope);
}

function risingHoroscopeId(sign: string) {
  return `sky-rising-horoscope-${normalizedSign(sign).replace(/[^a-z0-9]+/gu, "-")}`;
}

export function SkyRisingHoroscopes({ activeRisingSign, entries }: SkyRisingHoroscopesProps) {
  const completeEntries = completeSkyRisingHoroscopeSet(entries);

  if (completeEntries.length === 0) {
    return null;
  }

  const activeSign = normalizedSign(activeRisingSign);

  return (
    <section
      className="article-card sky-rising-horoscopes-card"
      aria-labelledby="sky-rising-horoscopes-title"
    >
      <h2 className="sr-only" id="sky-rising-horoscopes-title">All rising-sign horoscopes</h2>
      <details className="sky-rising-horoscopes" id="sky-rising-horoscopes">
        <summary aria-controls="sky-rising-horoscopes-content">
          <span className="sky-rising-horoscopes__summary-copy">
            <strong>See all 12 horoscopes</strong>
            <span>By rising sign</span>
          </span>
          <ChevronDown aria-hidden="true" className="sky-rising-horoscopes__chevron" size={22} />
        </summary>

        <div className="sky-rising-horoscopes__content" id="sky-rising-horoscopes-content">
          <nav className="sky-rising-horoscopes__nav" aria-label="Jump to a rising-sign horoscope">
            {completeEntries.map((entry) => {
              const sign = entry.risingSign ?? "";
              const isActive = normalizedSign(sign) === activeSign;

              return (
                <a
                  aria-current={isActive ? "true" : undefined}
                  href={`#${risingHoroscopeId(sign)}`}
                  key={`jump-${sign}`}
                >
                  {sign}
                </a>
              );
            })}
          </nav>

          <div className="sky-rising-horoscopes__list">
            {completeEntries.map((entry) => {
              const sign = entry.risingSign ?? "";
              const isActive = normalizedSign(sign) === activeSign;
              const headingId = `${risingHoroscopeId(sign)}-title`;

              return (
                <section
                  aria-labelledby={headingId}
                  className={`sky-rising-horoscope${isActive ? " sky-rising-horoscope--active" : ""}`}
                  id={risingHoroscopeId(sign)}
                  key={entry.contentKey ?? sign}
                >
                  <h3 className="sky-rising-horoscope__title" id={headingId}>{sign} rising</h3>
                  {readerFacingParagraphs([entry.body]).map((paragraph, index) => (
                    <p key={`${entry.contentKey ?? sign}-${index}`}>{paragraph}</p>
                  ))}
                </section>
              );
            })}
          </div>
        </div>
      </details>
    </section>
  );
}
