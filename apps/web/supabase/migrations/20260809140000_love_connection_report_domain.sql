-- Register Love & Connection in the shared report-domain dimension.

alter table public.user_reports
  drop constraint if exists user_reports_report_dimensions_check;

alter table public.user_reports
  add constraint user_reports_report_dimensions_check
    check (
      (
        report_type = 'report'
        and report_domain is not null
        and report_horizon is not null
        and report_domain in ('general', 'work_money', 'love_connection')
        and report_horizon in ('1_month', '4_months', '6_months', '12_months')
      )
      or (
        report_type <> 'report'
        and report_domain is null
        and report_horizon is null
      )
    );
