import { contentUpdateEvent, type ContentUpdateNotice } from "../../web/src/services/contentUpdateSignal";

type StudioEditorReturnContext = {
  childContentKey: string;
  /**
   * The row the way back leads to. Opening it again is walking back rather than
   * a new hop, so the offer is dropped instead of pointing at the row on screen.
   */
  parentContentKey?: string;
  label: string;
  returnToParent: () => void;
  /**
   * A trip taken to fix one referenced source returns as soon as it is saved.
   * A plain way back only offers the route; the owner may keep working on the
   * row they opened and decide when to go back.
   */
  saveReturns?: boolean;
};
type ReturnAfterSave = "published" | "any" | null;

let context: StudioEditorReturnContext | null = null;
let returnAfterSave: ReturnAfterSave = null;
let listening = false;

function performReturn() {
  if (!context) return;
  const callback = context.returnToParent;
  context = null;
  returnAfterSave = null;
  window.requestAnimationFrame(callback);
}

function ensureListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener(contentUpdateEvent, (event) => {
    if (!context || !returnAfterSave) return;
    const notice = (event as CustomEvent<ContentUpdateNotice>).detail;
    if (!notice || notice.contentKey !== context.childContentKey) return;
    if (returnAfterSave === "published" && !notice.published) return;
    performReturn();
  });
}

export function rememberStudioEditorReturn(next: StudioEditorReturnContext) {
  context = next;
  returnAfterSave = null;
  ensureListener();
}

export function studioEditorReturnContext() {
  return context;
}

export function requestStudioReturnAfterSave(mode: Exclude<ReturnAfterSave, null>) {
  if (!context) return false;
  returnAfterSave = mode;
  ensureListener();
  return true;
}

export function cancelStudioReturnAfterSave() {
  returnAfterSave = null;
}

export function returnToStudioParentEditor() {
  if (!context) return false;
  performReturn();
  return true;
}

export function clearStudioEditorReturn() {
  context = null;
  returnAfterSave = null;
}
