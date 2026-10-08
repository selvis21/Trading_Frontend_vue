<script setup lang="ts">
import { computed } from 'vue';
import { ArrowLeftRight, Banknote, PieChart, Layers } from '@lucide/vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import BreakdownBars from '@/components/charts/BreakdownBars.vue';
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue';
import DepositWithdrawalChart from './DepositWithdrawalChart.vue';
import MoneyAmount from './MoneyAmount.vue';
import { useFinanceMetrics, useTransactionTypeCounts } from '@/queries/finance';

/* The four finance distribution panels:
 *  • Deposit vs Withdrawal — money bars over all-time completed totals.
 *  • Net Flow — the integer difference, directional.
 *  • Transaction Status Distribution — donut over transactions_by_status.
 *  • Wallet Distribution — transactions by type (deposit/withdrawal/
 *    transfer/credit), the closest available proxy for where wallet money
 *    moves. All money is integer minor units; net is integer subtraction.
 */
const metrics = useFinanceMetrics();
const typeCounts = useTransactionTypeCounts();

const deposits = computed(() => metrics.data.value?.completed_deposits_total ?? 0);
const withdrawals = computed(() => metrics.data.value?.completed_withdrawals_total ?? 0);
const net = computed(() => deposits.value - withdrawals.value);
const statusData = computed(() => metrics.data.value?.transactions_by_status ?? {});
const loading = computed(() => metrics.isLoading.value);
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <SkeletonCard v-if="loading" />
    <section v-else class="rounded-lg border border-border bg-surface p-4">
      <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <ArrowLeftRight class="size-4 text-muted" /> Deposit vs Withdrawal
      </h3>
      <DepositWithdrawalChart :deposits="deposits" :withdrawals="withdrawals" />
    </section>

    <SkeletonCard v-if="loading" />
    <section v-else class="flex flex-col rounded-lg border border-border bg-surface p-4">
      <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <Banknote class="size-4 text-muted" /> Net Flow
      </h3>
      <div class="flex flex-1 flex-col items-center justify-center py-2">
        <MoneyAmount :minor="net" signed colored strong class="text-3xl" />
        <p class="mt-1 text-xs text-muted">Completed deposits − withdrawals (all time)</p>
      </div>
    </section>

    <SkeletonCard v-if="loading" />
    <section v-else class="rounded-lg border border-border bg-surface p-4">
      <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <PieChart class="size-4 text-muted" /> Transaction Status Distribution
      </h3>
      <DonutChart :data="statusData" />
    </section>

    <SkeletonCard v-if="typeCounts.isLoading.value" />
    <section v-else class="rounded-lg border border-border bg-surface p-4">
      <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <Layers class="size-4 text-muted" /> Wallet Distribution
      </h3>
      <BreakdownBars :data="typeCounts.data.value" tone="info" />
      <p class="mt-2 text-[11px] text-muted">By transaction type (wallet-affecting movements).</p>
    </section>
  </div>
</template>
