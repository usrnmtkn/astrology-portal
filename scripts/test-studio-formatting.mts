import assert from 'node:assert/strict';
import './test-studio-markdown-parser.mjs';
import React, { Suspense } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormattedProse, FormattedText, FormattedParagraph } from '../apps/web/src/components/FormattedProse';
import FormattedWritingContent, { PreparedProse as PreparedFormattedProse } from '../apps/web/src/components/FormattedWritingContent';
import { writingDocument, preserveWritingVariables } from '../apps/web/src/content/formattedText';
import { fullDetailReaderFacingCopy } from '../apps/web/src/content/readerSafety';
import { hasWritingFormatting as hasFormatting } from '../apps/web/src/content/formattedText';
for (const text of ['Plain paragraph.', '**Bold**', '*italic*', 'under_score', '\\literal', '- First', '+ First', '* First', '3. Third', 'Text\n  4. Fourth', '3.14 is a number', '-not a list', '', 'Line one\nLine two']) {
 assert.equal(hasFormatting(text), /(?:[*_\\]|^\s*(?:[-+]|\d+\.)\s)/mu.test(text));
}
const render = (text: string) => renderToStaticMarkup(React.createElement(FormattedWritingContent, { text }));
for (const child of [
 React.createElement(FormattedProse, { text: '**Complete** passage.' }),
 React.createElement(FormattedText, { text: '**Complete** inline.' }),
 React.createElement(FormattedParagraph, { parts: [{ text: '- **Complete** list.' }], renderPart: () => null })
]) {
 const initial = renderToStaticMarkup(React.createElement(Suspense, { fallback: React.createElement('span', null, 'Loading fixture') }, child));
 assert.equal(initial, '<span>Loading fixture</span>', 'The owning boundary must retain loading until formatted copy is ready.');
}
assert.equal(renderToStaticMarkup(React.createElement(FormattedProse, { text: 'Original text.\nFinal line.' })), '<p>Original text.\nFinal line.</p>');
assert.equal(renderToStaticMarkup(React.createElement(PreparedFormattedProse, { text: 'Original text.\nFinal line.' })), '<p>Original text.\nFinal line.</p>');
assert.equal(renderToStaticMarkup(React.createElement(PreparedFormattedProse, { text: 'First.\n\nFinal.', className:'fixture-copy' })), '<p class="fixture-copy">First.\n\nFinal.</p>');
assert.equal(render('First.\n\nFinal.'), '<p>First.</p><p>Final.</p>');
assert.equal(renderToStaticMarkup(React.createElement(PreparedFormattedProse, { text:React.createElement('em',null,'Complete child.') })), '<p><em>Complete child.</em></p>');
assert.equal(renderToStaticMarkup(React.createElement(PreparedFormattedProse, { text: '**Opening** paragraph.\n\n- First complete item\n- Final complete item' })), '<p><strong>Opening</strong> paragraph.</p><ul class="formatted-prose-list"><li><p>First complete item</p></li><li><p>Final complete item</p></li></ul>');
assert.equal(render('**Bold** and *italic*.'), '<p><strong>Bold</strong> and <em>italic</em>.</p>');
assert.match(render('***Both***'), /<(strong|em)>.*<(strong|em)>Both/);
assert.equal(render('- First\n- Second'), '<ul class="formatted-prose-list"><li><p>First</p></li><li><p>Second</p></li></ul>');
assert.equal(render('3. Third\n4. Fourth'), '<ol class="formatted-prose-list" start="3"><li><p>Third</p></li><li><p>Fourth</p></li></ol>');
const nested = '- **Parent**\n  - *Child*\n- Final';
assert.match(render(fullDetailReaderFacingCopy([nested])!), /<li><p><strong>Parent<\/strong><\/p><ul/);
assert.match(render(fullDetailReaderFacingCopy([nested])!), /<em>Child<\/em>/);
assert.match(render('**{{seasonName}}** begins.\n\n- {{openingText}}'), /<strong>\{\{seasonName\}\}<\/strong>/);
const attack = render('**Safe** <img src=x onerror="alert(1)">\n\n<script>alert(2)</script>\n\n[click](javascript:alert(3))');
assert.ok(!/<(?:img|script|a)(?:\s|>)/u.test(attack), attack);
assert.ok(attack.includes('&lt;img') && attack.includes('&lt;script') && attack.includes('javascript:'), attack);
assert.equal(renderToStaticMarkup(React.createElement(FormattedWritingContent, { inline: true, text: '**Inline** and *emphasis*' })), '<strong>Inline</strong> and <em>emphasis</em>');
assert.deepEqual(writingDocument('**Literal** <tag>'), { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Literal', marks: [{ type: 'bold' }] }, { type: 'text', text: ' ' }, { type: 'text', text: '<tag>' }] }] });

assert.equal(preserveWritingVariables('**{{custom.my\\_phrase}}** and {{#days}}'), '**{{custom.my_phrase}}** and {{#days}}');
assert.equal(preserveWritingVariables('Words with an\\_underscore.'), 'Words with an\\_underscore.');

const embeddedLink = React.createElement('a', { href: '#qa' }, 'QA link');
const linkedList = renderToStaticMarkup(React.createElement(FormattedWritingContent, {
  text: 'The \uFFFC0\uFFFC opening.\n\n- **First**\n- *Final*',
  inlineEmbeds: { delimiter: '\uFFFC', nodes: [embeddedLink] }
}));
assert.equal(linkedList, '<p>The <a href="#qa">QA link</a> opening.</p><ul class="formatted-prose-list"><li><p><strong>First</strong></p></li><li><p><em>Final</em></p></li></ul>');
console.log('Studio formatting: emphasis, ordered/unordered/nested lists, variables, complete copy and HTML safety passed.');
