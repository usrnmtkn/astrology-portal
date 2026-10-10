import React, { Fragment, type ReactNode } from 'react';
import { writingDocument, writingInline, type WritingNode } from '../../../apps/web/src/content/formattedText';

type InlineEmbeds = { delimiter: string; nodes: ReactNode[] };
type Presentation = { emphasizeOpening?: boolean; renderText?: (text: string) => ReactNode };

function withOpeningEmphasis(nodes: WritingNode[]) {
  const text = nodes.map(node => node.text ?? "").join("");
  let remaining = text.match(/^[\s\S]*?[.!?](?=\s|$)/u)?.[0].length ?? 0;
  return nodes.flatMap(node => {
    if (node.type !== "text" || !node.text || remaining <= 0) return [node];
    const count = Math.min(remaining, node.text.length);
    remaining -= count;
    const marks = node.marks?.some(mark => mark.type === "bold") ? node.marks : [...(node.marks ?? []), { type: "bold" }];
    return [{ ...node, text: node.text.slice(0, count), marks }, ...(count < node.text.length ? [{ ...node, text: node.text.slice(count) }] : [])] as WritingNode[];
  });
}

function renderNode(node: WritingNode, index: number, className?: string, listClassName?: string, inlineEmbeds?: InlineEmbeds, presentation?: Presentation): ReactNode {
  const content = node.type === 'paragraph' && presentation?.emphasizeOpening ? withOpeningEmphasis(node.content ?? []) : node.content;
  const children = content?.map((child, i) => renderNode(child, i, className, listClassName, inlineEmbeds, presentation));
  if (node.type === 'text') {
    let text: ReactNode = inlineEmbeds ? node.text?.split(inlineEmbeds.delimiter).map((part, i) =>
      <Fragment key={i}>{i % 2 === 1 && /^\d+$/u.test(part) ? inlineEmbeds.nodes[Number(part)] : part}</Fragment>) : presentation?.renderText ? presentation.renderText(node.text ?? '') : node.text;
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
function Prose({ text, className, listClassName = 'formatted-prose-list', inlineEmbeds, ...presentation }: { text: string; className?: string; listClassName?: string; inlineEmbeds?: InlineEmbeds } & Presentation) {
  return <>{writingDocument(text).content?.map((node, index) => renderNode(node, index, className, listClassName, inlineEmbeds, presentation))}</>;
}

/** For copy inside an existing paragraph, link, label, or list item. */
function Inline({ text, ...presentation }: { text: string } & Presentation) {
  return <>{writingInline(text).map((node, index) => renderNode(node, index, undefined, undefined, undefined, presentation))}</>;
}

export default function FormattedWritingContent({ text, inline = false, className, listClassName, inlineEmbeds, ...presentation }: { text: string; inline?: boolean; className?: string; listClassName?: string; inlineEmbeds?: InlineEmbeds } & Presentation) {
  return inline ? <Inline text={text} {...presentation} /> : <Prose text={text} className={className} listClassName={listClassName} inlineEmbeds={inlineEmbeds} {...presentation} />;
}
