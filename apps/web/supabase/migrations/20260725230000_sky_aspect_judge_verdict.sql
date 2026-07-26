alter table public.generated_interpretations
  add column if not exists judge_score integer,
  add column if not exists judge_verdict text,
  add column if not exists judge_gate text,
  add column if not exists judge_why text;

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_judge_score_check,
  add constraint generated_interpretations_judge_score_check
    check (judge_score is null or judge_score between 1 and 3);

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_judge_gate_check,
  add constraint generated_interpretations_judge_gate_check
    check (
      judge_gate is null
      or judge_gate in ('auto-publish', 'human-review', 'regenerate')
    );

create index if not exists generated_interpretations_sky_judge_queue_idx
  on public.generated_interpretations (judge_gate, updated_at desc)
  where block_type = 'sky_aspect';

comment on column public.generated_interpretations.judge_score is
  'Sky-aspect voice judge score from 1 (off voice) to 3 (publishable).';
comment on column public.generated_interpretations.judge_verdict is
  'Short verdict returned by the sky-aspect voice judge.';
comment on column public.generated_interpretations.judge_gate is
  'Routing decision: auto-publish, human-review, or regenerate.';
comment on column public.generated_interpretations.judge_why is
  'Editorial rationale returned by the sky-aspect voice judge.';
