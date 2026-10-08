<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  TrendingUp,
  ShieldCheck,
  LineChart,
  Banknote,
} from '@lucide/vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import DrillDownDrawer from '@/components/dashboard/DrillDownDrawer.vue';
import FunnelChart from '@/components/charts/FunnelChart.vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import BreakdownBars from '@/components/charts/BreakdownBars.vue';
import { formatMoney } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import {
  useSalesDashboard,
  useComplianceDashboard,
  useTradingDashboard,
  useFinanceDashboard,
} from '@/queries/dashboard';
import type { Kpi, StatWidget } from '@/types/dashboard';
import type { StatusTone } from '@/types';

/* Insights — the data-viz row. Reuses the same cached typed-dashboard
 * queries as the widget grid (no extra requests for the period range).
 * Each chart drills into a full breakdown drawer. */
const auth = useAuthStore();
const sales = useSalesDashboard();
const compliance = useComplianceDashboard();
const trading = useTradingDashboard();
const finance = useFinanceDashboard();

function widget(
  list: StatWidget[] | undefined,
  key: string,
): Record<string, number> {
  return list?.find((w) => w.key === key)?.data ?? {};
}
function kpi(list: Kpi[] | undefined, key: string): Kpi | undefined {
  return list?.find((k) => k.key === key);
}

// Lead funnel: Total → Converted (+ pool as context).
const funnel = computed(() => {
  const k = sales.data.value?.kpis;
  const total = Number(kpi(k, 'total_leads')?.value ?? 0);
  const converted = Number(kpi(k, 'converted_leads')?.value ?? 0);
  if (!total) return [];
  return [
    { label: 'Total leads', value: total },
    { label: 'Converted', value: converted },
  ];
});

const kycDist = computed(() =>
  widget(compliance.data.value?.widgets, 'profiles_by_status'),
);
const tradingDist = computed(() =>
  widget(trading.data.value?.widgets, 'accounts_by_status'),
);
const financeFlow = computed(() => {
  const k = finance.data.value?.kpis;
  return {
    deposits: Number(kpi(k, 'deposits_total')?.value ?? 0),
    withdrawals: Number(kpi(k, 'withdrawals_total')?.value ?? 0),
    net: Number(kpi(k, 'net_flow')?.value ?? 0),
  };
});

// drill-down drawer
const drill = ref<{ open: boolean; title: string; data: Record<string, number>; tone: StatusTone }>(
  { open: false, title: '', data: {}, tone: 'info' },
);
function openDrill(title: string, data: Record<string, number>, tone: StatusTone) {
  drill.value = { open: true, title, data, tone };
}
</script>

<template>
  <section class="space-y-3">
    <h2 class="text-sm font-semibold text-fg">Insights</h2>
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Lead funnel -->
      <WidgetCard
        v-if="auth.can('leads.view')"
        title="Lead conversion funnel"
        :icon="TrendingUp"
        :loading="sales.isLoading.value"
        :error="sales.isError.value"
        :empty="sales.isSuccess.value && !funnel.length"
        skeleton="bars"
        @retry="sales.refetch()"
      >
        <FunnelChart :stages="funnel" />
      </WidgetCard>

      <!-- KYC distribution -->
      <WidgetCard
        v-if="auth.can('compliance.view')"
        title="KYC status distribution"
        :icon="ShieldCheck"
        :loading="compliance.isLoading.value"
        :error="compliance.isError.value"
        :empty="compliance.isSuccess.value && !Object.keys(kycDist).length"
        skeleton="chart"
        @retry="compliance.refetch()"
      >
        <template #action>
          <button
            class="text-xs font-medium text-primary hover:underline"
            @click="openDrill('KYC status distribution', kycDist, 'accent')"
          >
            Details
          </button>
        </template>
        <DonutChart :data="kycDist" />
      </WidgetCard>

      <!-- Trading accounts -->
      <WidgetCard
        v-if="auth.can('trading.view')"
        title="Trading accounts by status"
        :icon="LineChart"
        :loading="trading.isLoading.value"
        :error="trading.isError.value"
        :empty="trading.isSuccess.value && !Object.keys(tradingDist).length"
        skeleton="bars"
        @retry="trading.refetch()"
      >
        <template #action>
          <button
            class="text-xs font-medium text-primary hover:underline"
            @click="openDrill('Trading accounts by status', tradingDist, 'success')"
          >
            Details
          </button>
        </template>
        <BreakdownBars
          :data="tradingDist"
          tone="success"
          clickable
          @select="() => openDrill('Trading accounts by status', tradingDist, 'success')"
        />
      </WidgetCard>

      <!-- Finance summary -->
      <WidgetCard
        v-if="auth.can('finance.view')"
        title="Finance summary"
        subtitle="Selected period"
        :icon="Banknote"
        :loading="finance.isLoading.value"
        :error="finance.isError.value"
        skeleton="lines"
        @retry="finance.refetch()"
      >
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="rounded-lg bg-status-success/5 p-3">
            <p class="text-xs text-muted">Deposits</p>
            <p class="mt-1 text-base font-semibold tabular-nums text-money-positive">
              {{ formatMoney(financeFlow.deposits) }}
            </p>
          </div>
          <div class="rounded-lg bg-status-danger/5 p-3">
            <p class="text-xs text-muted">Withdrawals</p>
            <p class="mt-1 text-base font-semibold tabular-nums text-money-negative">
              {{ formatMoney(financeFlow.withdrawals) }}
            </p>
          </div>
          <div class="rounded-lg bg-surface-sunken p-3">
            <p class="text-xs text-muted">Net flow</p>
            <p
              class="mt-1 text-base font-semibold tabular-nums"
              :class="financeFlow.net >= 0 ? 'text-money-positive' : 'text-money-negative'"
            >
              {{ formatMoney(financeFlow.net) }}
            </p>
          </div>
        </div>
        <BreakdownBars
          class="mt-4"
          :data="widget(finance.data.value?.widgets, 'transactions_by_status')"
          tone="info"
        />
      </WidgetCard>
    </div>
  </section>

  <DrillDownDrawer
    v-model:open="drill.open"
    :title="drill.title"
    :data="drill.data"
    :tone="drill.tone"
  />
</template>
