<script setup lang="ts">
import { computed, h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import DataTable from '@/components/data/DataTable.vue';
import { formatReportValue, isNumericType } from '@/composables/useReportFormat';
import type { ReportDataset } from '@/types/reports';

/* Renders a report dataset as a virtualized table with type-aware cell
 * formatting (currency columns via formatMoney). Rows are filtered
 * client-side by the row-filter query across all cells. */
const props = defineProps<{
  dataset?: ReportDataset;
  loading?: boolean;
  error?: boolean;
  rowFilter?: string;
}>();
const emit = defineEmits<{ retry: [] }>();

type Row = Record<string, unknown> & { __i: number };

const rows = computed<Row[]>(() => {
  const data = (props.dataset?.rows ?? []).map((r, i) => ({ ...r, __i: i }));
  const q = (props.rowFilter ?? '').trim().toLowerCase();
  if (!q) return data;
  return data.filter((row) =>
    Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q)),
  );
});

const columns = computed<ColumnDef<Row, any>[]>(() =>
  (props.dataset?.columns ?? []).map((col) => ({
    accessorKey: col.key,
    header: col.label,
    cell: ({ row }) =>
      h(
        'span',
        { class: isNumericType(col.type) ? 'tabular-nums' : '' },
        formatReportValue(row.original[col.key], col.type),
      ),
  })),
);
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :loading="loading"
    :error="error"
    :row-key="(r) => r.__i"
    virtualize
    max-height="32rem"
    empty-title="No rows"
    empty-description="This report returned no data for the selected filters."
    @retry="emit('retry')"
  />
</template>
