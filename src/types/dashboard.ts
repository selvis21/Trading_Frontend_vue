/* ------------------------------------------------------------------ *
 * Dashboard read-model types — mirror the Laravel Dashboard DTOs
 * (app/Domains/Dashboard/Data/*). Currency KPI values are integer
 * MINOR units (cents); percent values are already percentages.
 * ------------------------------------------------------------------ */
export type KpiFormat = 'number' | 'currency' | 'percent';

export interface Kpi {
  key: string;
  label: string;
  value: number | string;
  format: KpiFormat;
  delta: number | null;
  icon: string | null;
}

export type WidgetType = 'breakdown' | 'series';

export interface StatWidget {
  key: string;
  label: string;
  type: WidgetType;
  data: Record<string, number>;
}

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface AlertItem {
  key: string;
  level: AlertLevel;
  message: string;
  count: number | null;
  link: string | null;
}

export interface PendingAction {
  key: string;
  label: string;
  count: number;
  link: string | null;
}

export interface ActivityItem {
  domain: 'sales' | 'compliance' | 'trading' | 'finance' | string;
  type: string;
  description: string | null;
  occurred_at: string;
  user_id: number | null;
  client_id: number | null;
}

export interface DashboardFilterDto {
  from: string;
  to: string;
  business_unit_id: number | null;
}

export interface DashboardData {
  key: string;
  title: string;
  filter: DashboardFilterDto;
  generated_at: string;
  kpis: Kpi[];
  widgets: StatWidget[];
  alerts: AlertItem[];
  pending_actions: PendingAction[];
  activity: ActivityItem[];
}

export interface DashboardIndex {
  available: string[];
  default: DashboardData;
}

/** The typed dashboards keyed by their permission gate. */
export type DashboardKey =
  | 'sales'
  | 'compliance'
  | 'trading'
  | 'finance'
  | 'executive';

export type DashboardPeriod = 'today' | '7d' | '30d' | 'qtd';
