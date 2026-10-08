<script setup lang="ts" generic="TData">
import { computed, ref, useTemplateRef } from 'vue';
import {
  FlexRender,
  getCoreRowModel,
  useVueTable,
  type ColumnDef,
  type SortingState,
  type Updater,
} from '@tanstack/vue-table';
import { useVirtualizer } from '@tanstack/vue-virtual';
import { ChevronUp, ChevronDown, ChevronsUpDown } from '@lucide/vue';
import { cn } from '@/lib/utils';
import SkeletonTable from '@/components/skeleton/SkeletonTable.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import ErrorState from '@/components/feedback/ErrorState.vue';
import DataTablePagination from './DataTablePagination.vue';

/* ------------------------------------------------------------------ *
 * Advanced table — TanStack headless logic + themed chrome.
 * Server-side pagination & sorting, optional row selection (bulk
 * actions), optional row virtualization (large pages), and first-class
 * loading / empty / error states.
 * ------------------------------------------------------------------ */
const props = defineProps<{
  data: TData[];
  columns: ColumnDef<TData, any>[];
  loading?: boolean;
  error?: boolean;
  // server pagination (optional)
  page?: number;
  pageSize?: number;
  total?: number;
  lastPage?: number;
  // server sorting
  sort?: SortingState;
  rowKey?: (row: TData) => string | number;
  emptyTitle?: string;
  emptyDescription?: string;
  // selection (bulk actions)
  selectable?: boolean;
  selected?: (string | number)[];
  // virtualization
  virtualize?: boolean;
  maxHeight?: string;
  estimateRowHeight?: number;
}>();

const emit = defineEmits<{
  'update:page': [value: number];
  'update:pageSize': [value: number];
  'update:sort': [value: SortingState];
  'update:selected': [value: (string | number)[]];
  rowClick: [row: TData];
  retry: [];
}>();

const sorting = computed(() => props.sort ?? []);
function onSortingChange(updater: Updater<SortingState>) {
  const next = typeof updater === 'function' ? updater(sorting.value) : updater;
  emit('update:sort', next);
}

const table = useVueTable({
  get data() {
    return props.data;
  },
  get columns() {
    return props.columns;
  },
  state: {
    get sorting() {
      return sorting.value;
    },
  },
  manualPagination: true,
  manualSorting: true,
  onSortingChange,
  getCoreRowModel: getCoreRowModel(),
});

const showPagination = computed(
  () => props.total !== undefined && props.pageSize !== undefined,
);
const colSpan = computed(
  () => props.columns.length + (props.selectable ? 1 : 0),
);

/* -------- selection -------- */
const selectedSet = computed(() => new Set(props.selected ?? []));
function keyOf(row: TData): string | number {
  return props.rowKey ? props.rowKey(row) : JSON.stringify(row);
}
const allSelected = computed(
  () =>
    props.data.length > 0 &&
    props.data.every((r) => selectedSet.value.has(keyOf(r))),
);
function toggleAll() {
  emit(
    'update:selected',
    allSelected.value ? [] : props.data.map(keyOf),
  );
}
function toggleRow(row: TData) {
  const k = keyOf(row);
  const next = new Set(selectedSet.value);
  next.has(k) ? next.delete(k) : next.add(k);
  emit('update:selected', [...next]);
}

/* -------- virtualization -------- */
const scrollEl = useTemplateRef<HTMLElement>('scrollEl');
const rows = computed(() => table.getRowModel().rows);
const virtualizer = useVirtualizer(
  computed(() => ({
    count: rows.value.length,
    getScrollElement: () => scrollEl.value,
    estimateSize: () => props.estimateRowHeight ?? 44,
    overscan: 8,
  })),
);
const virtualRows = computed(() => virtualizer.value.getVirtualItems());
const padTop = computed(() => virtualRows.value[0]?.start ?? 0);
const padBottom = computed(() => {
  const total = virtualizer.value.getTotalSize();
  const last = virtualRows.value[virtualRows.value.length - 1];
  return last ? total - last.end : 0;
});
</script>

<template>
  <div class="space-y-1">
    <ErrorState v-if="error" @retry="emit('retry')" />
    <SkeletonTable
      v-else-if="loading && !data.length"
      :cols="columns.length"
      :rows="pageSize ?? 8"
    />
    <template v-else>
      <div
        ref="scrollEl"
        class="relative overflow-auto rounded-lg border border-border bg-surface"
        :style="virtualize ? { maxHeight: maxHeight ?? '32rem' } : undefined"
      >
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr
              v-for="hg in table.getHeaderGroups()"
              :key="hg.id"
              class="border-b border-border bg-surface-sunken"
            >
              <th
                v-if="selectable"
                class="sticky top-0 z-[1] w-10 bg-surface-sunken px-3 py-2.5 ps-4"
              >
                <input
                  type="checkbox"
                  class="size-4 rounded border-input accent-primary"
                  :checked="allSelected"
                  aria-label="Select all"
                  @change="toggleAll"
                />
              </th>
              <th
                v-for="header in hg.headers"
                :key="header.id"
                :style="{ width: header.getSize() ? `${header.getSize()}px` : undefined }"
                class="sticky top-0 z-[1] whitespace-nowrap bg-surface-sunken px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted first:ps-4 last:pe-4"
              >
                <button
                  v-if="header.column.getCanSort() && !header.isPlaceholder"
                  class="inline-flex items-center gap-1 transition-colors hover:text-fg"
                  @click="header.column.toggleSorting()"
                >
                  <FlexRender
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                  <ChevronUp
                    v-if="header.column.getIsSorted() === 'asc'"
                    class="size-3"
                  />
                  <ChevronDown
                    v-else-if="header.column.getIsSorted() === 'desc'"
                    class="size-3"
                  />
                  <ChevronsUpDown v-else class="size-3 opacity-40" />
                </button>
                <FlexRender
                  v-else-if="!header.isPlaceholder"
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="virtualize && padTop > 0" :style="{ height: `${padTop}px` }">
              <td :colspan="colSpan" />
            </tr>
            <tr
              v-for="row in virtualize
                ? virtualRows.map((vr) => rows[vr.index])
                : rows"
              :key="rowKey ? rowKey(row.original) : row.id"
              :class="
                cn(
                  'border-b border-border transition-colors last:border-0 hover:bg-muted-surface/50',
                  selectedSet.has(keyOf(row.original)) && 'bg-primary/[0.04]',
                  $attrs.onRowClick !== undefined && 'cursor-pointer',
                )
              "
              @click="emit('rowClick', row.original)"
            >
              <td
                v-if="selectable"
                class="w-10 px-3 ps-4"
                @click.stop
              >
                <input
                  type="checkbox"
                  class="size-4 rounded border-input accent-primary"
                  :checked="selectedSet.has(keyOf(row.original))"
                  :aria-label="`Select row`"
                  @change="toggleRow(row.original)"
                />
              </td>
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="px-3 align-middle text-fg first:ps-4 last:pe-4"
                :style="{ height: 'var(--row-height)', paddingTop: 'var(--cell-py)', paddingBottom: 'var(--cell-py)' }"
              >
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </td>
            </tr>
            <tr
              v-if="virtualize && padBottom > 0"
              :style="{ height: `${padBottom}px` }"
            >
              <td :colspan="colSpan" />
            </tr>
          </tbody>
        </table>

        <div v-if="!data.length" class="p-2">
          <EmptyState
            :title="emptyTitle ?? 'No results'"
            :description="emptyDescription ?? 'Try adjusting your filters.'"
          />
        </div>

        <div
          v-if="loading && data.length"
          class="pointer-events-none absolute inset-0 bg-bg/30"
        />
      </div>

      <DataTablePagination
        v-if="showPagination"
        :page="page ?? 1"
        :page-size="pageSize ?? 25"
        :total="total ?? 0"
        :last-page="lastPage ?? 1"
        :selected-count="selected?.length"
        @update:page="emit('update:page', $event)"
        @update:page-size="emit('update:pageSize', $event)"
      />
    </template>
  </div>
</template>
