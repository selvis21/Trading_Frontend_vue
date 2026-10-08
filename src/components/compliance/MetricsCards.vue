<script setup lang="ts">
import { computed } from 'vue';
import { ShieldCheck, FileClock, FileX, CircleUserRound } from '@lucide/vue';
import KpiCard from '@/components/metrics/KpiCard.vue';
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue';
import { useComplianceMetrics } from '@/queries/compliance';

/* KPI row for the compliance dashboard/profiles header. */
const q = useComplianceMetrics();

const cards = computed(() => {
  const m = q.data.value;
  const s = m?.profiles_by_status;
  return [
    { label: 'In progress', value: s?.in_progress ?? 0, icon: FileClock },
    { label: 'Verified', value: s?.verified ?? 0, icon: ShieldCheck },
    { label: 'Rejected', value: s?.rejected ?? 0, icon: FileX },
    { label: 'Identity verified', value: m?.identity_verified ?? 0, icon: CircleUserRound },
  ];
});
</script>

<template>
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <template v-if="q.isLoading.value">
      <SkeletonCard v-for="i in 4" :key="i" />
    </template>
    <KpiCard
      v-for="c in cards"
      v-else
      :key="c.label"
      :label="c.label"
      :value="c.value"
      :icon="c.icon"
    />
  </div>
</template>
