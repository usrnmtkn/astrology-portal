-- Model report horizon and product domain as independent dimensions. Legacy
-- horizon-specific report types are backfilled to the General domain.

alter table public.user_reports
  add column if not exists report_domain text,
  add column if not exists report_horizon text;

alter table public.user_reports
  drop constraint if exists user_reports_report_type_check;

update public.user_reports
set
  report_domain = 'general',
  report_horizon = case report_type
    when 'report_1_month' then '1_month'
    when 'report_4_months' then '4_months'
    when 'report_6_months' then '6_months'
    when 'report_12_months' then '12_months'
  end,
  report_type = 'report'
where report_type in (
  'report_1_month',
  'report_4_months',
  'report_6_months',
  'report_12_months'
);

alter table public.user_reports
  add constraint user_reports_report_type_check
    check (report_type in ('year_ahead', 'relationship', 'saturn_return', 'report')),
  add constraint user_reports_report_dimensions_check
    check (
      (
        report_type = 'report'
        and report_domain is not null
        and report_horizon is not null
        and report_domain in ('general', 'work_money')
        and report_horizon in ('1_month', '4_months', '6_months', '12_months')
      )
      or (
        report_type <> 'report'
        and report_domain is null
        and report_horizon is null
      )
    );

drop index if exists public.user_reports_unique_period_idx;

create unique index user_reports_unique_period_idx
  on public.user_reports (
    user_id,
    report_type,
    report_domain,
    report_horizon,
    subject_id,
    period_start
  )
  nulls not distinct;
