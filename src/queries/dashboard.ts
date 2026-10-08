import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import { useDashboardStore } from '@/stores/dashboard';
import type {
  ActivityItem,
  AlertItem,
  DashboardData,
  DashboardIndex,
  DashboardKey,
  PendingAction,
} from '@/types/dashboard';

/* ------------------------------------------------------------------ *
 * Dashboard query layer.
 *
 * Every typed dashboard is permission-gated (enabled only when the user
 * holds the gate the backend route enforces), period-aware (keyed by the
 * shared date range so a period change refetches), and cached. The
 * operations feeds (pending actions / alerts) background-refresh.
 * ------------------------------------------------------------------ */

/** The personal dashboard + the list of dashboards the user may view. */
export function usePersonalDashboard() {
  const auth = useAuthStore();
  return useQuery({
    queryKey: queryKeys.dashboard.index,
    enabled: computed(() => auth.can('dashboard.view')),
    staleTime: 60_000,
    queryFn: () => api.get<DashboardIndex>('/dashboard'),
  });
}

const GATE: Record<DashboardKey, string> = {
  sales: 'leads.view',
  compliance: 'compliance.view',
  trading: 'trading.view',
  finance: 'finance.view',
  executive: 'dashboard.executive',
};

/**
 * Fetch a typed dashboard for a given date range. Disabled (no request)
 * when the user lacks the route's permission gate.
 */
export function useTypedDashboard(
  key: DashboardKey,
  range: MaybeRefOrGetter<{ from: string; to: string }>,
) {
  const auth = useAuthStore();
  return useQuery({
    queryKey: computed(() => queryKeys.dashboard.typed(key, toValue(range))),
    enabled: computed(() => auth.can(GATE[key])),
    staleTime: 60_000,
    queryFn: () => {
      const r = toValue(range);
      return api.get<DashboardData>(`/dashboard/${key}`, {
        from: r.from,
        to: r.to,
      });
    },
  });
}

/** Convenience hooks bound to the shared period (and the "today" range). */
export function useSalesDashboard() {
  const store = useDashboardStore();
  return useTypedDashboard('sales', () => store.range);
}
export function useComplianceDashboard() {
  const store = useDashboardStore();
  return useTypedDashboard('compliance', () => store.range);
}
export function useTradingDashboard() {
  const store = useDashboardStore();
  return useTypedDashboard('trading', () => store.range);
}
export function useFinanceDashboard() {
  const store = useDashboardStore();
  return useTypedDashboard('finance', () => store.range);
}
/** Finance numbers anchored to *today* (Today's Deposits/Withdrawals). */
export function useFinanceToday() {
  const store = useDashboardStore();
  return useTypedDashboard('finance', () => store.todayRange);
}

/** Unified activity feed. `limit` is reactive so "load more" refetches. */
export function useActivityFeed(limit: MaybeRefOrGetter<number>) {
  const auth = useAuthStore();
  return useQuery({
    queryKey: computed(() => queryKeys.dashboard.activity(toValue(limit))),
    enabled: computed(() => auth.can('dashboard.view')),
    staleTime: 30_000,
    placeholderData: (prev) => prev, // keep prior page visible while growing
    queryFn: () =>
      api
        .get<{ activity: ActivityItem[] }>('/dashboard/activity', {
          limit: toValue(limit),
        })
        .then((d) => d.activity),
  });
}

/** Workflow queue sizes — background-refreshed every 60s. */
export function usePendingActions() {
  const auth = useAuthStore();
  return useQuery({
    queryKey: queryKeys.dashboard.pendingActions,
    enabled: computed(() => auth.can('dashboard.view')),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryFn: () =>
      api
        .get<{ pending_actions: PendingAction[] }>('/dashboard/pending-actions')
        .then((d) => d.pending_actions),
  });
}

/** System / compliance / finance alerts — background-refreshed. */
export function useAlerts() {
  const auth = useAuthStore();
  return useQuery({
    queryKey: queryKeys.dashboard.alerts,
    enabled: computed(() => auth.can('dashboard.view')),
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: () =>
      api.get<{ alerts: AlertItem[] }>('/dashboard/alerts').then((d) => d.alerts),
  });
}

/** Manually refresh every dashboard query (e.g. a header "refresh" button). */
export function useRefreshDashboard() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['dashboard'] });
}
