import type { AdminDraft, AdminGeneratedContentRow } from "./GeneratedContentAdminDashboard";

export type WheelTooltipEditorState = {
  draft: AdminDraft;
  baseline: string | null;
  savedInput: string | null;
  row: AdminGeneratedContentRow | null;
};

/** Editor-lifetime drafts only. Navigation never saves or publishes a source. */
export class WheelTooltipEditorSession {
  private readonly sources = new Map<string, WheelTooltipEditorState>();
  remember(state: WheelTooltipEditorState) { this.sources.set(state.draft.contentKey, state); }
  previewBodies() {
    return [...this.sources.values()].filter(state => JSON.stringify(state.draft) !== state.baseline && JSON.stringify(state.draft) !== state.savedInput)
      .map(state => ({ key: state.draft.contentKey, body: state.draft.body }));
  }
  hasUnsavedExcept(key?: string) {
    return [...this.sources.values()].some(state => state.draft.contentKey !== key
      && JSON.stringify(state.draft) !== state.baseline && JSON.stringify(state.draft) !== state.savedInput);
  }
  async open(key: string, load: () => Promise<WheelTooltipEditorState>) {
    const cached = this.sources.get(key);
    if (cached) return cached;
    const state = await load();
    if (state.draft.contentKey !== key) throw new Error("The tooltip source did not match the selection.");
    this.remember(state);
    return state;
  }
}
