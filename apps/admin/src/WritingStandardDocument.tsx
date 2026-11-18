import { Fragment } from 'react';
import FormattedWritingContent from '../../../src/shared/components/FormattedWritingContent';

export type WritingStandard = { body: string; bodySha256: string; sourceUrl: string | null };

/** Render the complete source in order; never trim, excerpt or rewrite its prose. */
export default function WritingStandardDocument({ standard }: { standard: WritingStandard }) {
  return <>
    <article className="writing-standard-document" aria-label="Writing standard" data-source-sha256={standard.bodySha256}>
      {standard.body.split(/(?=^#{1,3} )/mu).filter(Boolean).map((section, index) => {
        const newline = section.indexOf('\n');
        const line = newline < 0 ? section : section.slice(0, newline);
        const match = /^(#{1,3}) (.*)$/u.exec(line);
        if (!match) return <FormattedWritingContent key={index} text={section} />;
        const body = newline < 0 ? '' : section.slice(newline + 1);
        const Heading = match[1].length === 1 ? 'h1' : match[1].length === 2 ? 'h2' : 'h3';
        return <Fragment key={index}>
          {index === 1 && match[1].length === 3 ? <p>{match[2]}</p> : <Heading>{match[2]}</Heading>}
          {body.trim() && <FormattedWritingContent text={body} />}
        </Fragment>;
      })}
    </article>
    <details className="studio-contained-disclosure">
      <summary>Source and provenance</summary>
      {standard.sourceUrl && <a href={standard.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}
      <p>Exact source SHA-256</p><code>{standard.bodySha256}</code>
    </details>
  </>;
}
