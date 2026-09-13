import { contentUpdateEvent, type ContentUpdateNotice } from "../../web/src/services/contentUpdateSignal";

type StudioEditorReturnContext = {
  childContentKey: string;
  label: string;
  returnToParent: () => void;
};

let context: StudioEditorReturnContext | null = null;
let returnAfterPublish = false;
let listening = false;

function ensureListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener(contentUpdateEvent, (event) => {
    if (!context || !returnAfterPublish) return;
    const notice = (event as CustomEvent<ContentUpdateNotice>).detail;
    if (!notice?.published || notice.contentKey !== context.childContentKey) return;
    const callback = context.returnToParent;
    context = null;
    returnAfterPublish = false;
    window.requestAnimationFrame(callback);
  });
}

export function rememberStudioEditorReturn(next: StudioEditorReturnContext) {
  context = next;
  returnAfterPublish = false;
  ensureListener();
}

export function studioEditorReturnContext() {
  return context;
}

export function requestStudioReturnAfterPublish() {
  if (!context) return false;
  returnAfterPublish = true;
  ensureListener();
  return true;
}

export function cancelStudioReturnAfterPublish() {
  returnAfterPublish = false;
}

export function returnToStudioParentEditor() {
  if (!context) return false;
  const callback = context.returnToParent;
  context = null;
  returnAfterPublish = false;
  callback();
  return true;
}

export function clearStudioEditorReturn() {
  context = null;
  returnAfterPublish = false;
}
