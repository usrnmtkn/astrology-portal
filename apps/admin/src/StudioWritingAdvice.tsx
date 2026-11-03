import {skySummaryWordingAdvisories} from "../../web/src/content/skyDailySummaryCatalog";
import {skyDebilityWordingAdvisories} from "../../web/src/content/skyDebilityCatalog";
// @ts-ignore Shared JavaScript detector; suggestions never gate publication.
import {readerCopyIssues, readerCopyFields} from '../../web/src/content/editorialCopyBoundary.mjs';

export default function StudioWritingAdvice({value}: {value: unknown}) {
  const issues = [...new Set<string>(readerCopyIssues(value).map((issue: {reason: string}) => issue.reason))];
  const draft = value as {contentKey?: string; body?: string};
  const advice = [...skySummaryWordingAdvisories(draft.contentKey ?? "", draft.body ?? ""), ...skyDebilityWordingAdvisories(draft.contentKey ?? "", draft.body ?? "")];
  const text = readerCopyFields(value).map((field: {text: string}) => field.text).join('\n');
  return <details className="admin-hook-detail-section" aria-label="Optional writing suggestions">
    <summary>Writing suggestions (optional)</summary>
    <p>Your topics and wording are your choice. These suggestions do not prevent saving or publishing.</p>
    {/\b(?:tarot|major\s+arcana|minor\s+arcana)\b/iu.test(text) && <p>Tarot references are included in your published writing.</p>}
    {advice.map(reason => <p key={reason}>{reason}</p>)}
    {issues.map(reason => <p key={reason}>Possible {reason}. Review it if this wording was pasted unintentionally.</p>)}
  </details>;
}
