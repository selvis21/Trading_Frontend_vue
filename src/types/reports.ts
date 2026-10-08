/* ------------------------------------------------------------------ *
 * Reporting domain types — mirror app/Domains/Reporting/*.
 *
 * Reports return a full (unpaginated) dataset: typed columns + plain rows
 * + a summary object. Currency columns are INTEGER minor units (rendered
 * via formatMoney). Reports are not paginated; a row cap applies server
 * side (audit reports). Analytics areas are themselves report keys.
 * ------------------------------------------------------------------ */

export type ReportColumnType = 'string' | 'number' | 'currency' | 'percent' | 'date';

export type ReportCategory =
  | 'sales'
  | 'compliance'
  | 'trading'
  | 'finance'
  | 'kpi'
  | 'executive'
  | 'activity'
  | 'audit';

/** A catalogue entry from GET /reports. */
export interface ReportCatalogEntry {
  key: string;
  title: string;
  category: ReportCategory | string;
  exportable: boolean;
}

export interface ReportColumn {
  key: string;
  label: string;
  type: ReportColumnType;
}

/** The persisted/serialised report filter (matches ReportFilter::toArray()). */
export interface ReportFilterPayload {
  from: string;
  to: string;
  business_unit_id: number | null;
  extra: Record<string, unknown>;
}

/** GET /reports/{key} → data. */
export interface ReportDataset {
  key: string;
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
  filter: ReportFilterPayload;
  row_count: number;
  generated_at: string;
}

/** The filter inputs the UI collects and sends as query params. */
export interface ReportFilters {
  from?: string;
  to?: string;
  business_unit_id?: number | null;
  /** audit.status_changes scope: compliance | trading | finance. */
  domain?: string;
}

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type ScheduleFormat = 'csv';

export interface ScheduledReport {
  id: number;
  name: string;
  report_key: string;
  filters: Record<string, unknown>;
  frequency: ScheduleFrequency;
  format: ScheduleFormat;
  recipients: string[];
  is_active: boolean;
  owner_id: number | null;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string | null;
}

export interface ScheduledReportInput {
  name: string;
  report_key: string;
  frequency: ScheduleFrequency;
  format?: ScheduleFormat;
  filters?: Record<string, unknown>;
  recipients?: string[];
  is_active?: boolean;
  next_run_at?: string | null;
}

/* ---- client-side persistence (no backend endpoint) ---- */

/** A saved report "view": a report key + a named filter preset. */
export interface SavedReportView {
  id: string;
  name: string;
  report_key: string;
  filters: ReportFilters;
}

/** A recently-run report (MRU). */
export interface RecentReport {
  report_key: string;
  title: string;
  at: string;
}

/** A completed CSV export (no backend export history exists). */
export interface ExportHistoryItem {
  id: string;
  report_key: string;
  title: string;
  filename: string;
  at: string;
}

/* ---- category presentation + analytics map ---- */

export const CATEGORY_LABEL: Record<string, string> = {
  sales: 'Sales Reports',
  compliance: 'Compliance Reports',
  trading: 'Trading Reports',
  finance: 'Finance Reports',
  kpi: 'KPI Reports',
  executive: 'Executive Reports',
  activity: 'Activity Reports',
  audit: 'Audit Reports',
};

/** Category display order on the catalogue. */
export const CATEGORY_ORDER: string[] = [
  'sales',
  'compliance',
  'trading',
  'finance',
  'kpi',
  'executive',
  'activity',
  'audit',
];

/** The five analytics areas, each backed by a report key. */
export interface AnalyticsArea {
  key: string;
  title: string;
  report_key: string;
  /** Preferred visualization for this area's dataset. */
  chart: 'funnel' | 'donut' | 'bars' | 'flow';
}

/**
 * Per-report-key permission (mirrors the backend ReportRegistry gates).
 * Used to avoid firing a report the user can't access — which would 403 and
 * trip the global redirect — on auto-loading surfaces like the analytics
 * overview. The catalogue is already server-filtered, so direct links are
 * safe; this guards the eager multi-report pages.
 */
export const REPORT_PERMISSION: Record<string, string> = {
  'sales.conversion': 'leads.view',
  'sales.performance': 'leads.view',
  'compliance.kyc_status': 'compliance.view',
  'trading.accounts': 'trading.view',
  'finance.transactions': 'finance.view',
  'kpi.overview': 'reports.view',
  'executive.summary': 'dashboard.executive',
  'activity.summary': 'reports.view',
  'audit.status_changes': 'reports.view',
};

export const ANALYTICS_AREAS: AnalyticsArea[] = [
  { key: 'lead_conversion', title: 'Lead Conversion', report_key: 'sales.conversion', chart: 'bars' },
  { key: 'kyc_performance', title: 'KYC Performance', report_key: 'compliance.kyc_status', chart: 'donut' },
  { key: 'trading_growth', title: 'Trading Growth', report_key: 'trading.accounts', chart: 'bars' },
  { key: 'flows', title: 'Deposit / Withdrawal Trends', report_key: 'finance.transactions', chart: 'flow' },
  { key: 'activity_metrics', title: 'Activity Metrics', report_key: 'activity.summary', chart: 'bars' },
];
