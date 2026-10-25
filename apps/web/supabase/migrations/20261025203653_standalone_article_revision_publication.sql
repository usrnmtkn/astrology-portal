-- Retain the existing transaction, locks, receipts, permissions and CAS checks.
-- Fail on schema drift rather than replacing an unexpectedly changed function.
do $migration$
declare
  definition text := pg_get_functiondef('public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)'::regprocedure);
  actions text := $$p_action not in ('approve-package-revision','publish-sky-article-edition-revision')$$;
  proposal_check text := $$  if p_proposal_id<>p_target_id and ($$;
begin
  if position(actions in definition)=0 or position(proposal_check in definition)=0 then
    raise exception 'Unexpected content_studio_publish_revision definition; review migration against current schema';
  end if;
  definition := replace(definition, actions,
    $$p_action not in ('approve-package-revision','publish-sky-article-edition-revision','publish-standalone-article-revision')$$);
  definition := replace(definition, proposal_check, $guard$
  if p_action='publish-standalone-article-revision' and (
    p_proposal_id=p_target_id or target.content_key !~ '^article/(manual|guide)/'
    or target.mode is distinct from 'article' or target.status is distinct from 'LIVE'
    or proposal.mode is distinct from 'studio-draft' or proposal.event_type is distinct from 'standalone-article-revision'
    or proposal.content_key is distinct from target.content_key
  ) then
    raise sqlstate '22023' using message='Invalid standalone article revision target';
  end if;
  if p_proposal_id<>p_target_id and ($guard$);
  execute definition;
end
$migration$;

-- Older servers must fail closed rather than publish a private proposal itself.
alter table public.generated_interpretations
  add constraint standalone_article_revision_is_private check (
    event_type is distinct from 'standalone-article-revision'
    or (mode is not distinct from 'studio-draft' and lane is not distinct from 'reference'
      and status is distinct from 'LIVE')
  );
