/** Reader-side receipt shape. The API verifies exact hashes before admitting rows. */
export function hasStudioOwnerWording(row) {
  const snapshot=row?.source_snapshot ?? row?.sourceSnapshot;
  const approval=snapshot?.studioOwnerApproval;
  if(approval?.action==='publish-owner-content' && approval.contentKey===(row?.content_key ?? row?.contentKey)
    && /^[a-f0-9]{64}$/iu.test(approval.copyHash ?? '') && /^[a-f0-9]{64}$/iu.test(approval.bodyHash ?? '')) return true;
  const record=row?.sections?.packageRecord ?? row;
  const receipt=record?.content_boundary?.ownerPublication;
  return record?.content_boundary?.ownerPublishedWording===true && receipt?.action==='content-studio-publish'
    && /^[a-f0-9]{64}$/iu.test(receipt.payloadSha256 ?? '')
    && typeof receipt.recordPath==='string' && Boolean(receipt.recordPath.trim())
    && typeof receipt.approvedAt==='string' && Boolean(receipt.approvedAt.trim());
}
