import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Bold, Italic, List, ListOrdered, Undo2, Redo2 } from 'lucide-react';
import { writingDocument, preserveWritingVariables } from '../../web/src/content/formattedText';
import { StudioButton } from './StudioControls';

export default function StudioFormattingEditor({ value, label, maxLength, onChange, onDone }: {
  value: string; label: string; maxLength?: number; onChange: (value: string) => void; onDone: () => void;
}) {
  const [error, setError] = useState('');
  const [initialContent] = useState(() => writingDocument(value));
  const lastValue = useRef(value);
  const editor = useEditor({
    extensions: [StarterKit.configure({
      heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false,
      link: false, strike: false, underline: false, trailingNode: false
    }), Markdown],
    content: initialContent,
    autofocus: 'start',
    editorProps: { attributes: { role: 'textbox', 'aria-label': `${label} formatted text`, 'aria-multiline': 'true', class: 'studio-formatted-writing' } },
    onUpdate: ({ editor: writing }) => {
      const next = preserveWritingVariables(writing.getMarkdown());
      setError(maxLength !== undefined && next.length > maxLength ? `This field allows ${maxLength} characters, including formatting. Shorten it before saving.` : '');
      lastValue.current = next;
      onChange(next);
    }
  });
  useEffect(() => {
    if (editor && value !== lastValue.current) {
      lastValue.current = value;
      editor.commands.setContent(writingDocument(value), { emitUpdate: false });
    }
  }, [editor, value]);
  const active = useEditorState({ editor, selector: ({ editor: instance }) => ({
    bold: instance?.isActive('bold'), italic: instance?.isActive('italic'),
    bullet: instance?.isActive('bulletList'), ordered: instance?.isActive('orderedList'),
    undo: instance?.can().undo(), redo: instance?.can().redo()
  }) });
  if (!editor) return null;
  return <span className="studio-formatting-editor" role="group" aria-label={`Format ${label}`}>
    <span className="studio-formatting-toolbar" role="group" aria-label="Text formatting">
      <StudioButton aria-label="Bold" title="Bold (⌘/Ctrl+B)" aria-pressed={active?.bold} onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></StudioButton>
      <StudioButton aria-label="Italic" title="Italic (⌘/Ctrl+I)" aria-pressed={active?.italic} onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></StudioButton>
      <StudioButton aria-label="Bulleted list" title="Bulleted list" aria-pressed={active?.bullet} onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></StudioButton>
      <StudioButton aria-label="Numbered list" title="Numbered list" aria-pressed={active?.ordered} onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></StudioButton>
      <StudioButton aria-label="Undo formatting" title="Undo" disabled={!active?.undo} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></StudioButton>
      <StudioButton aria-label="Redo formatting" title="Redo" disabled={!active?.redo} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></StudioButton>
    </span>
    <EditorContent editor={editor} />
    {error && <span role="alert">{error}</span>}
    <span className="studio-formatting-toolbar">
      <StudioButton onClick={onDone}>Done formatting</StudioButton>
    </span>
  </span>;
}
