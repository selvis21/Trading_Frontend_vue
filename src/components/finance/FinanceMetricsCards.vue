<script setup lang="ts">
import { computed } from 'vue';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Activity,
  Wallet as WalletIcon,
} from '@lucide/vue';
import KpiCard from '@/components/metrics/KpiCard.vue';
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue';
import { formatKpi } from '@/lib/utils';
import { useFinanceToday } from '@/queries/dashboard';
import { useFinanceMetrics } from '@/queries/finance';
import type { DashboardData } from '@/types/dashboard';

/* Finance dashboard KPI row. Today's deposit/withdrawal/net-flow figures
 * come from the period-anchored finance lens; pending + wallet liquidity
 * from the all-time finance metrics. Every money value is an INTEGER minor
 * unit rendered with formatKpi → formatMoney. The "wallet balances" figure
 * is completed deposits − withdrawals (integer subtraction = net cash held
 * across all wallets); no floating-point maths is performed. */
const today = useFinanceToday();
const metrics = useFinanceMetrics();

function kpiValue(data: DashboardData | undefined, key: string): number {
  const k = data?.kpis.find((x) => x.key === key);
  return typeof k?.value === 'number' ? k.value : 0;
}

const depositsToday = computed(() => kpiValue(today.data.value, 'deposits_total'));
const withdrawalsToday = computed(() => kpiValue(today.data.value, 'withdrawals_total'));
const netFlowToday = computed(() => kpiValue(today.data.value, 'net_flow'));
const pending = computed(
  () => metrics.data.value?.transactions_by_status.pending ?? 0,
);
// Integer minor units: net cash held = completed deposits − withdrawals.
const walletBalances = computed(
  () =>
    (metrics.data.value?.completed_deposits_total ?? 0) -
    (metrics.data.value?.completed_withdrawals_total ?? 0),
);

const loading = computed(() => today.isLoading.value || metrics.isLoading.value);

const cards = computed(() => [
  { label: 'Deposits Today', value: formatKpi(depositsToday.value, 'currency'), icon: ArrowDownToLine, href: '/finance/deposits' },
  { label: 'Withdrawals Today', value: formatKpi(withdrawalsToday.value, 'currency'), icon: ArrowUpFromLine, href: '/finance/withdrawals' },
  { label: 'Net Flow (today)', value: formatKpi(netFlowToday.value, 'currency'), icon: Banknote },
  { label: 'Pending Transactions', value: pending.value, icon: Activity, href: '/finance/workspace' },
  { label: 'Wallet Balances (net)', value: formatKpi(walletBalances.value, 'currency'), icon: WalletIcon },
]);
</script>

<template>
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
    <template v-if="loading">
      <SkeletonCard v-for="i in 5" :key="i" />
    </template>
    <KpiCard
      v-for="c in cards"
      v-else
      :key="c.label"
      :label="c.label"
      :value="c.value"
      :icon="c.icon"
      :href="c.href"
    />
  </div>
</template>
