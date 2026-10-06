#!/usr/bin/env node

// Emit a guarded metadata repair for inspection/execution through an authorized
// database connection. This script has no credentials and never executes SQL.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const migrationVersion = '20260810210000';
export const migrationName = 'birth_time_normalization';
export const migrationSha256 = '5d254375526b1cd726c767fb3b6675e9d5cc34096fbf9c0439632b1cf9a64362';
export const previousStatement = `Applied directly under owner authorization 2026-08-10; SHA-256 ${migrationSha256}`;
export const migrationSource = new URL(`../apps/web/supabase/migrations/${migrationVersion}_${migrationName}.sql`, import.meta.url);

export function buildBirthTimeHistoryRepair(sourceSql = readFileSync(migrationSource, 'utf8')) {
  const actualHash = createHash('sha256').update(sourceSql).digest('hex');
  if (actualHash !== migrationSha256) throw new Error('Historical migration source does not match the recorded SHA-256.');
  const literal = value => `'${value.replaceAll("'", "''")}'`;
  return `begin;
set local standard_conforming_strings = on;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $history_repair$
declare
  current_name text;
  current_statements text[];
  source_sql constant text := ${literal(sourceSql)};
begin
  select name, statements into current_name, current_statements
    from supabase_migrations.schema_migrations
    where version = '${migrationVersion}' for update;
  if not found then
    raise exception 'Historical migration record is missing; refusing to invent an applied migration';
  end if;
  if current_name is distinct from '${migrationName}' then
    raise exception 'Historical migration name changed; refusing to overwrite it';
  end if;
  if current_statements = array[source_sql] then return; end if;
  if current_statements is distinct from array[${literal(previousStatement)}] then
    raise exception 'Historical migration statements changed; refusing to overwrite them';
  end if;
  -- Store SQL for future replay. Do not EXECUTE it against production: the
  -- historical migration includes a profile backfill and older function grants.
  update supabase_migrations.schema_migrations
    set statements = array[source_sql]
    where version = '${migrationVersion}';
end;
$history_repair$;
select version, name, cardinality(statements) as statement_count,
  encode(sha256(convert_to(statements[1], 'UTF8')), 'hex') as source_sha256
from supabase_migrations.schema_migrations where version = '${migrationVersion}';
commit;
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(buildBirthTimeHistoryRepair());
}
