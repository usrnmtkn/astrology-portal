import {Fragment, createElement, memo, type ReactNode} from 'react';
import {Lexer, type Token, type Tokens} from 'marked';

export const referenceHeadingId = (prefix: string, text: string) => `${prefix}-${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/gu,'')}`;
function inline(tokens: Token[]): ReactNode[] {
  return tokens.map((token,index) => {
    const children = 'tokens' in token ? inline(token.tokens ?? []) : null;
    if (token.type === 'strong') return <strong key={index}>{children}</strong>;
    if (token.type === 'em') return <em key={index}>{children}</em>;
    if (token.type === 'del') return <del key={index}>{children}</del>;
    if (token.type === 'codespan') return <code key={index}>{token.text}</code>;
    if (token.type === 'br') return <br key={index} />;
    // Source links, images and HTML stay inert. Only separately constructed,
    // commit-pinned provenance links are navigable.
    return <Fragment key={index}>{token.type === 'text' || token.type === 'escape' ? token.text : token.raw}</Fragment>;
  });
}

/** Full reference Markdown, separate from reader-copy rendering. React escapes
 * every source value; source text supplies no HTML, CSS or event handler. */
export default memo(function WritingReferenceText({text,prefix,title}: {text:string;prefix:string;title:string}) {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u,'');
  const ids = new Map<string,number>();
  let firstHeading = true, lastLevel = 2;
  function blocks(tokens: Token[]): ReactNode[] {
    return tokens.map((token,index) => {
      if (token.type === 'space') return null;
      if (token.type === 'heading') {
        if (firstHeading) { firstHeading=false; if (token.text === title) return null; }
        // Preserve the existing aspect document's subtitle presentation.
        if (title === 'TLDR Astro: Planetary Aspect Writing Standard' && token.text === 'Sky and Calendar | Editorial Voice and Astrological Interpretation') return <p key={index}>{inline(token.tokens??[])}</p>;
        const level=Math.min(6,Math.max(3,Math.min(token.depth+1,lastLevel+1)));lastLevel=level;
        const base=referenceHeadingId(prefix,token.text),n=(ids.get(base)??0)+1;ids.set(base,n);
        return createElement(`h${level}`,{key:index,id:n===1?base:`${base}-${n}`},inline(token.tokens??[]));
      }
      if (token.type === 'paragraph' || token.type === 'text') return <p key={index}>{token.tokens?inline(token.tokens):token.text}</p>;
      if (token.type === 'list') {
        const children=token.items.map((item:Tokens.ListItem,i:number)=><li key={i}>{blocks(item.tokens)}</li>);
        return token.ordered?<ol key={index} className="formatted-prose-list" start={Number(token.start)||1}>{children}</ol>:<ul key={index} className="formatted-prose-list">{children}</ul>;
      }
      if (token.type === 'blockquote') return <blockquote key={index}>{blocks(token.tokens??[])}</blockquote>;
      if (token.type === 'code') return <pre className="writing-reference-code" key={index}><code>{token.text}</code></pre>;
      if (token.type === 'table') {
        const table=token as Tokens.Table;
        return <div className="writing-reference-table" key={index}><table>
          <thead><tr>{table.header.map((cell,i)=><th key={i}>{inline(cell.tokens??[])}</th>)}</tr></thead>
          <tbody>{table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{inline(cell.tokens??[])}</td>)}</tr>)}</tbody>
        </table></div>;
      }
      if (token.type === 'hr') return <hr key={index} />;
      return <p className="memory-detail-content" key={index}>{token.raw}</p>;
    });
  }
  return <div className="writing-reference-copy">{blocks(Lexer.lex(body,{gfm:true,breaks:true}))}</div>;
});
