-- Read-only scan of saved reader fields. Metadata and source notes are excluded.
with recursive walk as (
select content_key,status, '$'::text path, jsonb_build_object('headline',headline,'summary',summary,'body',body,'sections',sections,'archetype_meaning',archetype_meaning,'workplace_translation',workplace_translation,'role_examples',role_examples,'growth_edge',growth_edge,'best_use',best_use,'stress_behavior',stress_behavior,'unfinished_lesson',unfinished_lesson) v, false reader from public.generated_interpretations
union all
select w.content_key,w.status,w.path||'.'||c.key,c.value,w.reader or c.key ~* '^(headline|title|heading|subtitle|summary|body(_?(you|they|sky))?|copy|article|tldr|text|markdown|compiledMarkdown|paragraphs|bullets|passage|opening|tension|development|close|try_this|fact_line|hook|lived|turn|guidance|advice|reading|experience|archetype_meaning|workplace_translation|role_examples|growth_edge|best_use|stress_behavior|unfinished_lesson)$'
from walk w cross join lateral (
select key,value from jsonb_each(case when jsonb_typeof(w.v)='object' then w.v else '{}'::jsonb end)
union all select (ordinality-1)::text,value from jsonb_array_elements(case when jsonb_typeof(w.v)='array' then w.v else '[]'::jsonb end) with ordinality
) c where c.key !~* '^(source.*|.*notes|provenance|.*history|baseline|review.*|approval.*|.*policy|facts|metadata|flags|prompt.*|model|provider|editorial.*|import.*|audit.*)$'
)
select content_key,status,path,left(v#>>'{}',220) sample from walk where reader and jsonb_typeof(v)='string'
and v#>>'{}' ~* '(^ *[a-z][a-z0-9_]* resolves as (interpretive|fact|gap|calculated|structural)|^ *SOURCE_GAP: *[a-z0-9_]+ has no authored source|^ *(REVIEWED|DRAFT|APPROVED|CONFIRMED|SOURCE_ONLY) *[·|]|Engine note:|layer two evergreen|needs_review|Templated article|Bespoke edition|Block architecture per|No axis paragraph on this surface, per the ruling|On approval: *imports|pending engine confirmation|\{\{ *[A-Za-z][A-Za-z0-9]* *:|^ *(Here is|Here.s) (your|the) (revised |updated |requested )?(draft|article|copy|passage))'
order by content_key,path;
