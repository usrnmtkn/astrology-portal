import { AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
import {
  ARTICLE_BLOCK_STYLE_LABELS,
  ARTICLE_BLOCK_STYLES,
  inferArticleBlockStyle,
  type ArticleBlockStyle
} from "../../web/src/content/articleBlockStyle";
import type { Astro101Block } from "../../web/src/content/astro101";

function emptyBlock(): Astro101Block {
  return { heading: "", body: "", style: "p", level: 2 };
}

export function ArticleBlockStyleFields({
  intro,
  blocks,
  bodyStyle,
  onIntroChange,
  onBlocksChange,
  onBodyStyleChange,
  showIntro = false,
  allowAdd = true
}: {
  intro?: string;
  blocks: Astro101Block[];
  bodyStyle?: string;
  onIntroChange?: (value: string) => void;
  onBlocksChange: (blocks: Astro101Block[]) => void;
  onBodyStyleChange?: (value: ArticleBlockStyle) => void;
  showIntro?: boolean;
  allowAdd?: boolean;
}) {
  return (
    <section className="admin-review-copy-editor studio-surface" aria-label="Article section styles">
      <p className="admin-eyebrow">Section styles</p>
      <p className="admin-field-hint">P, Lede, Note, Callout, H2, Placement, and Affirmation change how the section renders. They do not rewrite the copy.</p>
      {showIntro && onIntroChange ? (
        <label className="admin-review-copy-editor">
          <span>Intro</span>
          <StudioTextarea aria-label="Article intro" value={intro ?? ""} onChange={(event) => onIntroChange(event.target.value)} />
        </label>
      ) : null}
      {blocks.length === 0 && onBodyStyleChange ? (
        <label>
          <span>Body style</span>
          <AdminSelect
            aria-label="Body style"
            value={bodyStyle && bodyStyle.length ? bodyStyle : "p"}
            onChange={(event) => onBodyStyleChange(event.target.value as ArticleBlockStyle)}
          >
            {ARTICLE_BLOCK_STYLES.map((style) => (
              <option key={style} value={style}>{ARTICLE_BLOCK_STYLE_LABELS[style]}</option>
            ))}
          </AdminSelect>
        </label>
      ) : null}
      {blocks.map((block, index) => {
        const tag = inferArticleBlockStyle(block);
        return (
          <label className="admin-review-copy-editor" key={index}>
            <span>{block.heading || `Section ${index + 1}`}</span>
            <AdminSelect
              aria-label={`Section ${index + 1} style`}
              value={tag}
              onChange={(event) => {
                const nextTag = event.target.value as ArticleBlockStyle;
                onBlocksChange(blocks.map((entry, blockIndex) => (
                  blockIndex === index ? { ...entry, style: nextTag } : entry
                )));
              }}
            >
              {ARTICLE_BLOCK_STYLES.map((option) => (
                <option key={option} value={option}>{ARTICLE_BLOCK_STYLE_LABELS[option]}</option>
              ))}
            </AdminSelect>
            <StudioInput
              aria-label={`Section ${index + 1} heading`}
              value={block.heading ?? ""}
              onChange={(event) => {
                onBlocksChange(blocks.map((entry, blockIndex) => (
                  blockIndex === index ? { ...entry, heading: event.target.value } : entry
                )));
              }}
            />
            <StudioTextarea
              aria-label={`Section ${index + 1} body`}
              value={block.list?.length ? block.list.map(list => list.items.map((item, i) => `${list.ordered ? `${i + 1}.` : "-"} ${item}`).join("\n")).join("\n\n") : block.body ?? ""}
              onChange={(event) => {
                onBlocksChange(blocks.map((entry, blockIndex) => (
                  blockIndex === index ? { ...entry, body: event.target.value, list: undefined } : entry
                )));
              }}
            />
          </label>
        );
      })}
      {allowAdd ? (
        <StudioButton type="button" onClick={() => onBlocksChange([...blocks, emptyBlock()])}>
          Add section
        </StudioButton>
      ) : null}
    </section>
  );
}
