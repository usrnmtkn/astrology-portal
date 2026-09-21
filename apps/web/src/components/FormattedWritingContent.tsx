import React, { Fragment, type ReactNode } from 'react';
import { writingDocument, writingInline, type WritingNode } from '../content/formattedText';

type InlineEmbeds = { delimiter: string; nodes: ReactNode[] };

function renderNode(node: WritingNode, index: number, className?: string, listClassName?: string, inlineEmbeds?: InlineEmbeds): ReactNode {
  const children = node.content?.map((child, i) => renderNode(child, i, className, listClassName, inlineEmbeds));
  if (node.type === 'text') {
    let text: ReactNode = inlineEmbeds ? node.text?.split(inlineEmbeds.delimiter).map((part, i) =>
      <Fragment key={i}>{i % 2 === 1 && /^\d+$/u.test(part) ? inlineEmbeds.nodes[Number(part)] : part}</Fragment>) : node.text;
    for (const mark of node.marks ?? []) text = mark.type === 'bold' ? <strong>{text}</strong> : <em>{text}</em>;
    return <Fragment key={index}>{text}</Fragment>;
  }
  if (node.type === 'hardBreak') return <br key={index} />;
  if (node.type === 'paragraph') return <p className={className} key={index}>{children}</p>;
  if (node.type === 'listItem') return <li key={index}>{children}</li>;
  if (node.type === 'bulletList') return <ul className={listClassName} key={index}>{children}</ul>;
  if (node.type === 'orderedList') return <ol className={listClassName} start={node.attrs?.start} key={index}>{children}</ol>;
  return <Fragment key={index}>{children}</Fragment>;
}

/** Safe React elements only; reader copy can never supply HTML, CSS, or event handlers. */
function Prose({ text, className, listClassName = 'formatted-prose-list', inlineEmbeds }: { text: string; className?: string; listClassName?: string; inlineEmbeds?: InlineEmbeds }) {
  return <>{writingDocument(text).content?.map((node, index) => renderNode(node, index, className, listClassName, inlineEmbeds))}</>;
}

/** For copy inside an existing paragraph, link, label, or list item. */
function Inline({ text }: { text: string }) {
  return <>{writingInline(text).map((node, index) => renderNode(node, index))}</>;
}

export default function FormattedWritingContent({ text, inline = false, className, listClassName, inlineEmbeds }: { text: string; inline?: boolean; className?: string; listClassName?: string; inlineEmbeds?: InlineEmbeds }) {
  return inline ? <Inline text={text} /> : <Prose text={text} className={className} listClassName={listClassName} inlineEmbeds={inlineEmbeds} />;
}
