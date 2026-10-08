<script setup lang="ts">
import { computed } from 'vue';
import DashboardKpi from '@/components/dashboard/DashboardKpi.vue';
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue';
import { useAuthStore } from '@/stores/auth';
import {
  useSalesDashboard,
  useComplianceDashboard,
  useTradingDashboard,
  useFinanceToday,
} from '@/queries/dashboard';
import type { Kpi } from '@/types/dashboard';

/* The role-aware widget row. Each typed dashboard is fetched once (and
 * only when the user holds its permission gate); the relevant headline
 * KPIs are surfaced as drill-through tiles. Hidden widgets never render. */
const auth = useAuthStore();

const sales = useSalesDashboard();
const compliance = useComplianceDashboard();
const trading = useTradingDashboard();
const financeToday = useFinanceToday();

function pick(kpis: Kpi[] | undefined, key: string): Kpi | undefined {
  return kpis?.find((k) => k.key === key);
}

interface Tile {
  id: string;
  show: boolean;
  loading: boolean;
  kpi?: Kpi;
  href?: string;
  invert?: boolean;
}

const tiles = computed<Tile[]>(() => [
  {
    id: 'today-deposits',
    show: auth.can('finance.view'),
    loading: financeToday.isLoading.value,
    kpi: pick(financeToday.data.value?.kpis, 'deposits_total'),
    href: '/finance/deposits',
  },
  {
    id: 'today-withdrawals',
    show: auth.can('finance.view'),
    loading: financeToday.isLoading.value,
    kpi: pick(financeToday.data.value?.kpis, 'withdrawals_total'),
    href: '/finance/withdrawals',
  },
  {
    id: 'wallet-activity',
    show: auth.can('finance.view'),
    loading: financeToday.isLoading.value,
    kpi: pick(financeToday.data.value?.kpis, 'pending_transactions'),
    href: '/finance/transactions',
    invert: true,
  },
  {
    id: 'pending-kyc',
    show: auth.can('compliance.view'),
    loading: compliance.isLoading.value,
    kpi: pick(compliance.data.value?.kpis, 'pending_documents'),
    href: '/compliance/queue',
    invert: true,
  },
  {
    id: 'pending-requests',
    show: auth.can('trading.view'),
    loading: trading.isLoading.value,
    kpi: pick(trading.data.value?.kpis, 'pending_requests'),
    href: '/trading/requests',
    invert: true,
  },
  {
    id: 'new-leads',
    show: auth.can('leads.view'),
    loading: sales.isLoading.value,
    kpi: pick(sales.data.value?.kpis, 'new_leads'),
    href: '/leads',
  },
  {
    id: 'lead-conversion',
    show: auth.can('leads.view'),
    loading: sales.isLoading.value,
    kpi: pick(sales.data.value?.kpis, 'conversion_rate'),
    href: '/leads/pipeline',
  },
]);

const visible = computed(() => tiles.value.filter((t) => t.show));
</script>

<template>
  <section v-if="visible.length" class="space-y-3">
    <h2 class="text-sm font-semibold text-fg">Operations at a glance</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <template v-for="tile in visible" :key="tile.id">
        <SkeletonCard v-if="tile.loading" />
        <DashboardKpi
          v-else-if="tile.kpi"
          :kpi="tile.kpi"
          :href="tile.href"
          :invert-delta="tile.invert"
        />
      </template>
    </div>
  </section>
</template>
