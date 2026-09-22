// Run only after the CI job starts/resets its disposable local Supabase DB.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const database = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
function sql(query, allowFailure = false) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", [database, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", error = "";
    child.stdout.on("data", bytes => { output += bytes; });
    child.stderr.on("data", bytes => { error += bytes; });
    child.on("error", reject);
    child.on("exit", code => code && !allowFailure ? reject(new Error(error)) : resolve({ code, output, error }));
    child.stdin.end(query);
  });
}
const [sender, a, b] = [randomUUID(), randomUUID(), randomUUID()];
try {
  await sql(`insert into auth.users(id) values('${sender}'),('${a}'),('${b}');
    insert into public.social_profiles(user_id,handle,display_name) values
    ('${sender}','race_${sender.slice(0,8)}','Race sender'),('${a}','race_${a.slice(0,8)}','Race A'),('${b}','race_${b.slice(0,8)}','Race B');`);
  const created = await sql(`select set_config('request.jwt.claim.sub','${sender}',false);
    select invitation_id || '|' || invitation_token from public.create_social_share_invitation();`);
  const [id, token] = created.output.trim().split("\n").at(-1).split("|");
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  // First transaction holds the invitation row while both clients claim it.
  // The losing client must recheck claimed_by after the lock is released.
  const claim = user => sql(`begin;
    select set_config('request.jwt.claim.sub','${user}',true);
    select request_status from public.claim_social_invitation('${token}');
    select pg_sleep(1);
    commit;`, true);
  const results = await Promise.all([claim(a), claim(b)]);
  assert.equal(results.filter(result => result.code === 0).length, 1);
  assert.match(results.find(result => result.code !== 0).error, /already been used/);
  const count = await sql(`select count(*) from public.social_friendships where user_low_id='${sender}' or user_high_id='${sender}';`);
  assert.equal(count.output.trim(), "1");
  console.log("Concurrent invitation claims: one permitted winner, one rejection, one persisted friendship.");
} finally {
  await sql(`delete from auth.users where id in ('${sender}','${a}','${b}');`);
}
