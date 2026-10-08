import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useStorage } from '@vueuse/core';
import type { DashboardPeriod } from '@/types/dashboard';

/* ------------------------------------------------------------------ *
 * Dashboard UI state — the shared period selector that drives every
 * typed-dashboard query's date range. Persisted per user (device).
 * ------------------------------------------------------------------ */
function rangeFor(period: DashboardPeriod): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  const start = new Date(now);
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case 'qtd': {
      const q = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(q, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case '30d':
    default:
      start.setDate(start.getDate() - 30);
      break;
  }
  return { from: start.toISOString(), to };
}

export const useDashboardStore = defineStore('dashboard', () => {
  const period = useStorage<DashboardPeriod>('crm.dashboard.period', '30d');

  // Recomputed each access so "today" stays anchored to the current day.
  const range = computed(() => rangeFor(period.value));
  const todayRange = computed(() => rangeFor('today'));

  const periodLabel = computed(
    () =>
      ({
        today: 'Today',
        '7d': 'Last 7 days',
        '30d': 'Last 30 days',
        qtd: 'Quarter to date',
      })[period.value],
  );

  function setPeriod(p: DashboardPeriod): void {
    period.value = p;
  }

  return { period, range, todayRange, periodLabel, setPeriod };
});
