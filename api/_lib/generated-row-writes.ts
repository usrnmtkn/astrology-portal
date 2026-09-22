export class GeneratedRowWriteConflict extends Error {
  readonly statusCode = 409;
  constructor() { super('This content already exists or changed during generation. Its saved writing has not been overwritten. Reload it in Content Studio.'); }
}

export function generatedRowVersionQuery(row: { id: string; updated_at: string }) {
  if (!row.id || !row.updated_at) throw new GeneratedRowWriteConflict();
  return new URLSearchParams({ id: `eq.${row.id}`, updated_at: `eq.${row.updated_at}` }).toString();
}

export async function confirmedGeneratedRowWrite(response: Response) {
  const payload = await response.json().catch(() => null);
  if (response.status === 409 || (response.ok && Array.isArray(payload) && payload.length === 0)) throw new GeneratedRowWriteConflict();
  if (!response.ok) throw new Error(`Content storage rejected the save (${response.status}).`);
  if (!Array.isArray(payload) || payload.length !== 1) throw new Error('The content save could not be confirmed. Reload before trying again.');
  return payload;
}
