<script setup lang="ts">
import { computed } from 'vue';
import { LineChart, CircleCheck, PauseCircle, Inbox } from '@lucide/vue';
import KpiCard from '@/components/metrics/KpiCard.vue';
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue';
import { useTradingMetrics, useTradingRequests } from '@/queries/trading';

/* KPI row for the accounts list / workspace header. Account counts come
 * from the cached metrics snapshot; the pending-request count drills
 * through to the open-account request queue. */
const metrics = useTradingMetrics();
// page_size:1 — we only need the `total` for the pending-request badge.
const pending = useTradingRequests(() => ({ status: 'pending', page_size: 1 }));

const cards = computed(() => {
  const s = metrics.data.value?.accounts_by_status;
  return [
    { label: 'Total accounts', value: metrics.data.value?.total ?? 0, icon: LineChart, href: '/trading/accounts' },
    { label: 'Active', value: s?.active ?? 0, icon: CircleCheck, href: '/trading/accounts' },
    { label: 'Suspended', value: s?.suspended ?? 0, icon: PauseCircle, href: '/trading/accounts' },
    { label: 'Pending requests', value: pending.data.value?.total ?? 0, icon: Inbox, href: '/trading/requests' },
  ];
});
</script>

<template>
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <template v-if="metrics.isLoading.value">
      <SkeletonCard v-for="i in 4" :key="i" />
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
