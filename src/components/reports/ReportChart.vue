<script setup lang="ts">
import { computed } from 'vue';
import { BarChart3 } from '@lucide/vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import BreakdownBars from '@/components/charts/BreakdownBars.vue';
import FunnelChart from '@/components/charts/FunnelChart.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import type { ReportColumn, ReportDataset } from '@/types/reports';

/* Auto-visualizes a report dataset: derives a {label → value} series from
 * the first text column + first numeric column and renders the requested
 * chart. `auto` picks a donut for small count distributions, else bars. */
const props = withDefaults(
  defineProps<{
    dataset?: ReportDataset;
    prefer?: 'auto' | 'donut' | 'bars' | 'funnel' | 'flow';
  }>(),
  { prefer: 'auto' },
);

const columns = computed(() => props.dataset?.columns ?? []);
const labelCol = computed<ReportColumn | undefined>(() =>
  columns.value.find((c) => c.type === 'string'),
);
const valueCol = computed<ReportColumn | undefined>(
  () =>
    columns.value.find((c) => c.type === 'number') ??
    columns.value.find((c) => c.type === 'currency'),
);

const series = computed<Record<string, number>>(() => {
  const lc = labelCol.value;
  const vc = valueCol.value;
  if (!lc || !vc) return {};
  const out: Record<string, number> = {};
  for (const row of props.dataset?.rows ?? []) {
    const label = String(row[lc.key] ?? '—');
    const raw = row[vc.key];
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(n)) out[label] = (out[label] ?? 0) + n;
  }
  return out;
});

const stages = computed(() =>
  Object.entries(series.value)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value })),
);

const hasData = computed(() => Object.keys(series.value).length > 0);

const kind = computed(() => {
  if (props.prefer !== 'auto') return props.prefer;
  const count = Object.keys(series.value).length;
  return count > 0 && count <= 8 ? 'donut' : 'bars';
});
</script>

<template>
  <div>
    <EmptyState
      v-if="!hasData"
      :icon="BarChart3"
      title="Not chartable"
      description="This report has no obvious category + value columns to plot. Use the table view."
      class="border-0"
    />
    <DonutChart v-else-if="kind === 'donut'" :data="series" />
    <FunnelChart v-else-if="kind === 'funnel'" :stages="stages" />
    <BreakdownBars v-else :data="series" tone="info" />
  </div>
</template>
