import type { Component } from 'vue';
import {
  Users,
  ShieldCheck,
  LineChart,
  Wallet,
  Gauge,
  Crown,
  Activity,
  ScrollText,
  FileBarChart,
} from '@lucide/vue';
import type { StatusTone } from '@/types';

/* Category presentation for the report catalogue — icon + accent tone per
 * domain, matching the canonical status palette. */
export interface CategoryMeta {
  icon: Component;
  tone: StatusTone;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  sales: { icon: Users, tone: 'info' },
  compliance: { icon: ShieldCheck, tone: 'success' },
  trading: { icon: LineChart, tone: 'info' },
  finance: { icon: Wallet, tone: 'success' },
  kpi: { icon: Gauge, tone: 'accent' },
  executive: { icon: Crown, tone: 'accent' },
  activity: { icon: Activity, tone: 'warning' },
  audit: { icon: ScrollText, tone: 'neutral' },
};

export function categoryIcon(category: string): Component {
  return CATEGORY_META[category]?.icon ?? FileBarChart;
}

export function categoryTone(category: string): StatusTone {
  return CATEGORY_META[category]?.tone ?? 'neutral';
}
