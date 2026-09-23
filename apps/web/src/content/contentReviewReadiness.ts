import { isContentStudioReferenceSource } from "./contentStudioSourceRole.js";
export type ReviewableContent = {
    content_key: string;
    status?: string;
    body?: string | null;
    block_type?: string | null;
    judge_score?: number | null;
    judge_gate?: string | null;
    source_snapshot?: Record<string, any> | null;
};
/** Shared by editor and publication API: review status never substitutes for writing checks. */
export function skyWritingIssues(row: ReviewableContent): string[] {
    const placement = row.block_type === "sky_placement";
    if (!placement && row.block_type !== "sky_aspect")
        return [];
    const snapshot = row.source_snapshot ?? {};
    const lint = placement ? snapshot.skyPlacementVoiceLint ?? snapshot.skyPlacementTopperVoiceLint : snapshot.skyAspectVoiceLint;
    const judge = placement ? snapshot.skyPlacementJudge ?? snapshot.skyPlacementTopperJudge : snapshot.skyAspectJudge;
    const issues: string[] = [];
    if (!row.body?.trim())
        issues.push("Add the missing writing, then save the draft.");
    // Saving an edit explicitly invalidates its check. Historical findings refer
    // to the previous body and must not be presented as findings on this version.
    if (snapshot.studioWritingCheck === null) {
        issues.push("Run writing checks on this saved version before approving it. Your review is the final editorial decision.");
        return issues;
    }
    if (lint?.score !== 3 || lint?.fails !== 0) {
        const reasons = (Array.isArray(lint?.findings) ? lint.findings : [])
            .filter((finding: any) => finding.severity === "fail" && typeof finding.reason === "string")
            .map((finding: any) => finding.reason as string);
        issues.push(...(reasons.length ? reasons : ["Run writing checks on the saved draft."]));
    }
    const ownerFinal = row.judge_gate === "human-review" && snapshot.studioWritingCheck?.reviewPolicy === "owner-final-v1" && snapshot.studioWritingCheck?.contentKey === row.content_key;
    const eligible = row.judge_gate === "human-review" && judge?.recommendation === "approve" && judge?.approvalSource === "llm-advisory";
    if (!ownerFinal && (row.judge_score !== 3 || !eligible))
        issues.push("Run writing checks on this saved version before approving it. Your review is the final editorial decision.");
    return [...new Set(issues)];
}
export function reviewWorkBucket(row: ReviewableContent): "source" | "changes" | "ready" | "published" {
    if (isContentStudioReferenceSource(row.content_key, row.source_snapshot ?? {}))
        return "source";
    if (row.status === "LIVE" || row.status === "ARCHIVED")
        return "published";
    return !row.body?.trim() || skyWritingIssues(row).length ? "changes" : "ready";
}
