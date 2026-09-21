import React, { lazy, Suspense, type ReactNode } from 'react';
const FormattedWritingContent = lazy(() => import('./FormattedWritingContent'));
export const hasWritingList = (text: string) => /^\s*(?:[-+*]|\d+\.)\s/mu.test(text);
const hasFormatting = (text: string) => /(?:[*_\\]|^\s*(?:[-+]|\d+\.)\s)/mu.test(text);

/** Plain passages retain their exact rendering; formatted passages load the safe parser on demand. */
export function FormattedProse({ text, className, listClassName }: { text: ReactNode; className?: string; listClassName?: string }) {
  const plain = <p className={className}>{text}</p>;
  if (typeof text !== 'string' || !hasFormatting(text)) return plain;
  return <Suspense fallback={plain}><FormattedWritingContent text={text} className={className} listClassName={listClassName} /></Suspense>;
}

export function FormattedText({ text }: { text: ReactNode }) {
  if (typeof text !== 'string' || !hasFormatting(text)) return <>{text}</>;
  return <Suspense fallback={text}><FormattedWritingContent text={text} inline /></Suspense>;
}

/** Keep linked facts inline while parsing authored lists across the whole paragraph. */
export function FormattedParagraph<T extends { text: string }>({ parts, renderPart }: {
  parts: T[]; renderPart: (part: T, index: number) => ReactNode;
}) {
  const decorated = parts.map(renderPart);
  const plain = <p>{parts.map((part, index) => <React.Fragment key={index}>{decorated[index] ?? <FormattedText text={part.text} />}</React.Fragment>)}</p>;
  if (!parts.some(part => hasWritingList(part.text))) return plain;
  // These temporary placeholders exist only in this render, never in saved copy.
  // Choose a delimiter absent from the complete source so literal text cannot collide.
  const original = parts.map(part => part.text).join('');
  let delimiter = '\uFFFC';
  while (original.includes(delimiter)) delimiter += '\uFFFC';
  const text = parts.map((part, index) => decorated[index] != null && !hasWritingList(part.text)
    ? `${delimiter}${index}${delimiter}` : part.text).join('');
  return <Suspense fallback={plain}><FormattedWritingContent text={text} inlineEmbeds={{ delimiter, nodes: decorated }} /></Suspense>;
}
