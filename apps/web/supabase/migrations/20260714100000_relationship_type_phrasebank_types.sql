-- Align stored relationship_type values with the phrasebank composite variants.
-- Existing legacy values are normalized, while unusual custom values are left
-- untouched rather than rejected.

alter table public.manual_charts
  alter column relationship_type set default 'friendship';

alter table public.connections
  alter column relationship_type set default 'friendship';

update public.manual_charts
set relationship_type = case relationship_type
  when 'friend' then 'friendship'
  when 'acquaintance' then 'friendship'
  when 'neighbor-roommate' then 'friendship'
  when 'partner' then 'romantic'
  when 'romantic-partner' then 'romantic'
  when 'romantic-partner-ex' then 'exes'
  when 'romantic-situationship' then 'complicated'
  when 'family-sibling' then 'family'
  when 'work' then 'coworkers'
  when 'coworker' then 'coworkers'
  when 'business' then 'coworkers'
  when 'employer-manager' then 'coworkers'
  when 'teacher-mentor' then 'coworkers'
  when 'collaborator' then 'creative'
  when 'other' then 'complicated'
  else relationship_type
end
where relationship_type in (
  'friend',
  'acquaintance',
  'neighbor-roommate',
  'partner',
  'romantic-partner',
  'romantic-partner-ex',
  'romantic-situationship',
  'family-sibling',
  'work',
  'coworker',
  'business',
  'employer-manager',
  'teacher-mentor',
  'collaborator',
  'other'
);

update public.connections
set relationship_type = case relationship_type
  when 'friend' then 'friendship'
  when 'acquaintance' then 'friendship'
  when 'neighbor-roommate' then 'friendship'
  when 'partner' then 'romantic'
  when 'romantic-partner' then 'romantic'
  when 'romantic-partner-ex' then 'exes'
  when 'romantic-situationship' then 'complicated'
  when 'family-sibling' then 'family'
  when 'work' then 'coworkers'
  when 'coworker' then 'coworkers'
  when 'business' then 'coworkers'
  when 'employer-manager' then 'coworkers'
  when 'teacher-mentor' then 'coworkers'
  when 'collaborator' then 'creative'
  when 'other' then 'complicated'
  else relationship_type
end
where relationship_type in (
  'friend',
  'acquaintance',
  'neighbor-roommate',
  'partner',
  'romantic-partner',
  'romantic-partner-ex',
  'romantic-situationship',
  'family-sibling',
  'work',
  'coworker',
  'business',
  'employer-manager',
  'teacher-mentor',
  'collaborator',
  'other'
);
