import { Lexer, type Token, type Tokens } from 'marked';

/** The supported writing format: prose, emphasis, and lists. No HTML or executable links. */
export type WritingNode = {
  type: string;
  text?: string;
  marks?: { type: 'bold' | 'italic' }[];
  attrs?: { start: number };
  content?: WritingNode[];
};
const textNode = (text: string): WritingNode => ({ type: 'text', text });

function inline(tokens: Token[], marks: WritingNode['marks'] = []): WritingNode[] {
  return tokens.flatMap((token): WritingNode[] => {
    if (token.type === 'strong' || token.type === 'em') {
      return inline(token.tokens ?? [], [...marks, { type: token.type === 'strong' ? 'bold' : 'italic' }]);
    }
    if (token.type === 'br') return [{ type: 'hardBreak' }];
    // Unknown syntax and HTML remain literal text. Never interpret URLs, tags, or attributes.
    const text = token.type === 'text' || token.type === 'escape' ? token.text : token.raw;
    return text ? [{ ...textNode(text), ...(marks?.length ? { marks } : {}) }] : [];
  });
}
function blocks(tokens: Token[]): WritingNode[] {
  return tokens.flatMap((token): WritingNode[] => {
    if (token.type === 'space') return [];
    if (token.type === 'list') return [{
      type: token.ordered ? 'orderedList' : 'bulletList',
      ...(token.ordered ? { attrs: { start: Number(token.start) || 1 } } : {}),
      content: token.items.map((item: Tokens.ListItem) => ({ type: 'listItem', content: blocks(item.tokens) }))
    }];
    if (token.type === 'paragraph' || token.type === 'text') {
      return [{ type: 'paragraph', content: token.tokens ? inline(token.tokens) : [textNode(token.text)] }];
    }
    return [{ type: 'paragraph', content: [textNode(token.raw)] }];
  });
}
export function writingInline(text: string) { return inline(Lexer.lexInline(text, { gfm: false, breaks: true })); }

export function writingDocument(text: string): WritingNode {
  const content = blocks(Lexer.lex(text, { gfm: false, breaks: true }));
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

export function hasWritingFormatting(text: string) {
  return /(?:[*_\\]|^\s*(?:[-+]|\d+\.)\s)/mu.test(text);
}

/** Markdown escaping must never change a template variable's exact identifier. */
export function preserveWritingVariables(markdown: string) {
  return markdown.replace(/\{\{([^{}]*)\}\}/gu, (token, inner: string) => {
    const name = inner.replace(/\\([_.*])/gu, '$1');
    return /^\s*[#/^]?\s*[\w.]+\s*$/u.test(name) ? `{{${name}}}` : token;
  });
}
