import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { MarkdownManager } from '@tiptap/markdown';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { HardBreak } from '@tiptap/extension-hard-break';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';

const reader = createRequire(new URL('../apps/web/package.json', import.meta.url));
const editor = createRequire(reader.resolve('@tiptap/markdown'));
assert.equal(reader.resolve('marked'), editor.resolve('marked'), 'Reader and editor must share one parser, not duplicate it in the release.');
const manager = new MarkdownManager({ extensions: [Bold, Italic, Document, Paragraph, Text, HardBreak, BulletList, ListItem, OrderedList] });
// Marked 18 changes trailing blank-line tokens. Test the editor's normalized
// document and serializer, rather than assuming a shared version is compatible.
const fixtures = [
  ['First paragraph.\n\nFinal paragraph.', 2],
  ['First paragraph.\n\n\n\nFinal paragraph.', 3],
  ['**Bold** and *italic* and ***both***.', 1],
  ['- First\n- Second\n  - Nested', 1],
  ['3. Third\n4. Fourth', 1],
  ['**{{custom.my_phrase}}** is {{seasonName}}.', 1],
  ['First line.  \nFinal line.', 1],
  ['A literal <tag> and [text](javascript:alert(1)).', 1]
];
for (const [text, paragraphs] of fixtures) {
  const document = manager.parse(text);
  assert.equal(document.content.length, paragraphs, text);
  assert.deepEqual(manager.parse(manager.serialize(document)), document, text);
}
assert.equal(manager.parse('3. Third\n4. Fourth').content[0].attrs.start, 3);
assert.equal(manager.parse('- Parent\n  - Child').content[0].content[0].content[1].type, 'bulletList');
assert.equal(manager.parse('First line.  \nFinal line.').content[0].content[1].type, 'hardBreak');
console.log('PASS shared Markdown parser: paragraph spacing, nested/ordered lists, emphasis, variables, hard breaks and literal markup round trips.');
