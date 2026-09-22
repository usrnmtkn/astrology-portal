import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
export const publicationMigrations = [
  '20260907060000_content_studio_package_copy_mirrors.sql',
  '20260907061500_content_studio_revision_completion.sql',
  '20260907180000_content_publications.sql',
  '20260922002101_content_studio_private_versions.sql',
  '20260922003250_content_studio_publication_receipts.sql'
];
export const publicationTestSchema = `create role anon; create role authenticated; create role service_role bypassrls;
create table public.generated_interpretations (
 id uuid primary key,content_key text,updated_at timestamptz,status text,lane text,review_state text,
 headline text,summary text,body text,sections jsonb,facts jsonb,source_snapshot jsonb,mode text,event_type text,
 target_date date,surface text,provider text,prompt_version text,model text,block_type text,
 reviewed_at timestamptz,published_at timestamptz,judge_score numeric,judge_gate text,judge_verdict text,judge_why text,reviewer_notes text,
 flags text[],knowledge_ids text[],created_at timestamptz,evergreen boolean,evergreen_at timestamptz,evergreen_by text
);
grant all on public.generated_interpretations to service_role;`;
export async function createPublicationDb() {
  const db = new PGlite();
  await db.exec(publicationTestSchema);
  for (const name of publicationMigrations) await db.exec(readFileSync(new URL(`../../apps/web/supabase/migrations/${name}`, import.meta.url), 'utf8'));
  await db.query("select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false),set_config('request.headers','{\"x-content-publication-action\":\"publish\"}',false)");
  return db;
}
export async function seedPublicationRow(db, row) {
  await db.query('insert into generated_interpretations select * from jsonb_populate_record(null::generated_interpretations,$1)', [row]);
}
export async function callPublicationRpc(db, name, args) {
  const names = name === 'content_studio_publication_receipt' ? ['p_operation_id','p_actor','p_request_sha256']
    : ['p_operation_id','p_actor','p_request_sha256','p_action','p_proposal_id','p_proposal_version','p_target_id','p_target_version','p_patch','p_validation_context','p_dependencies'];
  const result = await db.query(`select public.${name}(${names.map((_, i) => `$${i+1}`).join(',')}) as receipt`, names.map(key => args[key]));
  return result.rows[0].receipt;
}
