import { isValidElement, type ReactNode } from "react";
import { isReaderFacingCopy } from "../../content/readerSafety";
import type { SkyDetail } from "../sky/SkyDetailArticle";

function hasReaderFacingNode(node: ReactNode): boolean {
  if (typeof node === "string") return isReaderFacingCopy(node);
  if (typeof node === "number") return true;
  if (Array.isArray(node)) return node.some(hasReaderFacingNode);
  return isValidElement(node);
}

/**
 * A Friends detail may open only when it has an eligible interpretation body.
 * Titles, metadata, mechanics captions, and related-aspect shells do not count.
 */
export function friendDetailHasReaderFacingContent(detail: Pick<SkyDetail, "body" | "sections" | "content">): boolean {
  if (detail.body.some(hasReaderFacingNode)) return true;
  if ((detail.sections ?? []).some((section) => hasReaderFacingNode(section.body))) return true;

  const voice = detail.content?.voice;
  return Boolean(
    voice
    && (isReaderFacingCopy(voice.body) || isReaderFacingCopy(voice.summary))
  );
}
