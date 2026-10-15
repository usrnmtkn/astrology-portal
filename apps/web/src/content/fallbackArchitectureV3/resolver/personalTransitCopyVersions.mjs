import { sha256Text } from './contentIntegrity.mjs';

const payload = row => JSON.stringify({
  contentKey: row.contentKey,
  headline: row.alternate_headline ?? '',
  you: row.body_you_alternate ?? '',
  friend: row.body_they_alternate ?? ''
});

/** Called by Studio only when the owner explicitly retains the saved live copy. */
export function retainPersonalTransitAlternate(row, version) {
  if (!String(row.contentKey).startsWith('authored/transit-aspect/')) throw new Error('Only personal transit aspects support this alternate.');
  if (row.alternate_copy_sha256) return {};
  if (![row.body_you, row.body_they].every(text => typeof text === 'string' && text.trim())) throw new Error('Both saved audiences are required to retain an alternate.');
  const alternate = {
    alternate_headline: row.headline ?? '',
    body_you_alternate: row.body_you,
    body_they_alternate: row.body_they,
    alternate_source_version: version
  };
  return { ...alternate, alternate_copy_sha256: sha256Text(payload({ ...row, ...alternate })) };
}

export function personalTransitCopyVersion(row, version = 'primary') {
  if (version === 'primary') return row;
  if (version !== 'alternate') throw new Error('Unknown personal transit writing version.');
  if (![row.body_you_alternate, row.body_they_alternate].every(text => typeof text === 'string' && text.trim())
    || row.alternate_copy_sha256 !== sha256Text(payload(row))) throw new Error('No verified alternate is available for this write-up.');
  return { ...row, headline: row.alternate_headline ?? '', body: row.body_you_alternate,
    body_you: row.body_you_alternate, body_they: row.body_they_alternate };
}
