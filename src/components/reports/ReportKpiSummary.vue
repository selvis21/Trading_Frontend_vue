<script setup lang="ts">
import { computed } from 'vue';
import KpiCard from '@/components/metrics/KpiCard.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { Gauge } from '@lucide/vue';
import {
  formatReportValue,
  inferSummaryType,
  humaniseKey,
} from '@/composables/useReportFormat';
import type { ReportColumnType, ReportDataset } from '@/types/reports';

/* KPI summary view. For the cross-domain KPI/executive reports (whose rows
 * carry an explicit `format` per metric) each row becomes a KPI tile. For
 * every other report the `summary` object is rendered, with the value type
 * inferred from the key + report category. Currency is integer minor units
 * via formatReportValue → formatMoney. */
const props = defineProps<{ dataset?: ReportDataset }>();

const category = computed(() => (props.dataset?.key ?? '').split('.')[0]);

// kpi.overview / executive.summary: columns metric + value + format.
const hasFormatRows = computed(() => {
  const keys = (props.dataset?.columns ?? []).map((c) => c.key);
  return keys.includes('metric') && keys.includes('value') && keys.includes('format');
});

interface Tile {
  label: string;
  value: string;
}

const tiles = computed<Tile[]>(() => {
  if (!props.dataset) return [];
  if (hasFormatRows.value) {
    return props.dataset.rows.map((row) => {
      const domain = row.domain ? `${row.domain} · ` : '';
      return {
        label: `${domain}${row.metric ?? ''}`,
        value: formatReportValue(row.value, (String(row.format) as ReportColumnType) || 'number'),
      };
    });
  }
  return Object.entries(props.dataset.summary ?? {}).map(([key, value]) => ({
    label: humaniseKey(key),
    value: formatReportValue(value, inferSummaryType(key, category.value)),
  }));
});
</script>

<template>
  <div>
    <EmptyState
      v-if="!tiles.length"
      :icon="Gauge"
      title="No summary"
      description="This report has no summary metrics."
      class="border-0"
    />
    <div v-else class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard v-for="(t, i) in tiles" :key="i" :label="t.label" :value="t.value" />
    </div>
  </div>
</template>
