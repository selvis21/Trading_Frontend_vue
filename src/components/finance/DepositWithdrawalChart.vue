<script setup lang="ts">
import { computed } from 'vue';
import { ArrowDownToLine, ArrowUpFromLine } from '@lucide/vue';
import MoneyAmount from './MoneyAmount.vue';

/* Deposit vs Withdrawal money bars + net flow. Amounts are INTEGER minor
 * units; bar widths are integer percentages (count-style maths on the
 * minor-unit integers, never a float money calculation). The net figure is
 * an integer subtraction rendered signed/coloured. */
const props = defineProps<{
  deposits: number;
  withdrawals: number;
  currencyId?: number | null;
}>();

// max in minor units; widths are integer percentages of it.
const max = computed(() => Math.max(props.deposits, props.withdrawals, 1));
const depPct = computed(() => Math.round((props.deposits * 100) / max.value));
const wdPct = computed(() => Math.round((props.withdrawals * 100) / max.value));
const net = computed(() => props.deposits - props.withdrawals);
</script>

<template>
  <div class="space-y-3">
    <div>
      <div class="mb-1 flex items-center justify-between text-xs">
        <span class="inline-flex items-center gap-1 font-medium text-fg">
          <ArrowDownToLine class="size-3.5 text-status-success" /> Deposits
        </span>
        <MoneyAmount :minor="deposits" :currency-id="currencyId" class="text-muted" />
      </div>
      <div class="h-2.5 overflow-hidden rounded-full bg-muted-surface">
        <div class="h-full rounded-full bg-status-success/70 transition-all duration-500" :style="{ width: `${depPct}%` }" />
      </div>
    </div>

    <div>
      <div class="mb-1 flex items-center justify-between text-xs">
        <span class="inline-flex items-center gap-1 font-medium text-fg">
          <ArrowUpFromLine class="size-3.5 text-status-danger" /> Withdrawals
        </span>
        <MoneyAmount :minor="withdrawals" :currency-id="currencyId" class="text-muted" />
      </div>
      <div class="h-2.5 overflow-hidden rounded-full bg-muted-surface">
        <div class="h-full rounded-full bg-status-danger/70 transition-all duration-500" :style="{ width: `${wdPct}%` }" />
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-border pt-2 text-sm">
      <span class="font-medium text-fg">Net flow</span>
      <MoneyAmount :minor="net" :currency-id="currencyId" signed colored strong />
    </div>
  </div>
</template>
