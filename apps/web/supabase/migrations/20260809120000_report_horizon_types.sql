-- Add the four canonical report horizons to the frozen report envelope.

alter table public.user_reports
  drop constraint if exists user_reports_report_type_check;

alter table public.user_reports
  add constraint user_reports_report_type_check
  check (
    report_type in (
      'year_ahead',
      'relationship',
      'saturn_return',
      'report_1_month',
      'report_4_months',
      'report_6_months',
      'report_12_months'
    )
  );
