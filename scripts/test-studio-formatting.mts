import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormattedProse } from '../apps/web/src/components/FormattedProse';
import FormattedWritingContent from '../apps/web/src/components/FormattedWritingContent';
import { writingDocument, preserveWritingVariables } from '../apps/web/src/content/formattedText';
import { fullDetailReaderFacingCopy } from '../apps/web/src/content/readerSafety';
const render = (text: string) => renderToStaticMarkup(React.createElement(FormattedWritingContent, { text }));
assert.equal(renderToStaticMarkup(React.createElement(FormattedProse, { text: 'Original text.\nFinal line.' })), '<p>Original text.\nFinal line.</p>');
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
