<script setup lang="ts">
import { computed } from 'vue';
import { RefreshCw, Bookmark, Download, Search, CalendarRange } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import { useBusinessUnits } from '@/queries/admin';
import type { ReportFilters } from '@/types/reports';

/* The report builder's filter panel. Date range is always available;
 * business unit is offered for the sales-performance report and a domain
 * selector for the audit report (the only server-side per-report filters).
 * A client-side row filter (over the full returned dataset) stands in for
 * ad-hoc Status/Type/User narrowing. */
const props = defineProps<{
  reportKey: string;
  filters: ReportFilters;
  rowFilter: string;
  loading?: boolean;
  exportable?: boolean;
  canExport?: boolean;
  canSchedule?: boolean;
}>();
const emit = defineEmits<{
  'update:filters': [v: ReportFilters];
  'update:rowFilter': [v: string];
  run: [];
  save: [];
  export: [];
}>();

const supportsBusinessUnit = computed(() => props.reportKey === 'sales.performance');
const supportsDomain = computed(() => props.reportKey === 'audit.status_changes');
const domains = ['compliance', 'trading', 'finance'];

// Prefer a named selector (business units are a first-class entity). The
// hierarchy read is gated behind users.*; report runners without it fall
// back to the ID field so the filter still works for every role that can
// open the report. Never a dead control.
const businessUnits = useBusinessUnits();
const unitOptions = computed(() => businessUnits.data.value ?? []);
const hasUnitOptions = computed(() => unitOptions.value.length > 0);

function patch(p: Partial<ReportFilters>) {
  emit('update:filters', { ...props.filters, ...p });
}
const field =
  'w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<template>
  <div class="space-y-4 rounded-lg border border-border bg-surface p-4">
    <h3 class="flex items-center gap-1.5 text-sm font-semibold text-fg">
      <CalendarRange class="size-4 text-muted" /> Filters
    </h3>

    <!-- date range -->
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted">From</label>
        <input
          type="date"
          :value="filters.from"
          :class="field"
          @change="patch({ from: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted">To</label>
        <input
          type="date"
          :value="filters.to"
          :class="field"
          @change="patch({ to: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <!-- business unit (sales.performance) -->
    <div v-if="supportsBusinessUnit" class="space-y-1.5">
      <label class="text-xs font-medium text-muted">Business unit</label>
      <select
        v-if="hasUnitOptions"
        :value="filters.business_unit_id ?? ''"
        :class="field"
        @change="patch({ business_unit_id: ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null })"
      >
        <option value="">All units</option>
        <option v-for="b in unitOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
      <input
        v-else
        type="number"
        min="1"
        :value="filters.business_unit_id ?? ''"
        placeholder="Business unit ID"
        :class="field"
        @change="patch({ business_unit_id: ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null })"
      />
    </div>

    <!-- domain (audit.status_changes) -->
    <div v-if="supportsDomain" class="space-y-1.5">
      <label class="text-xs font-medium text-muted">Domain</label>
      <select
        :value="filters.domain ?? 'finance'"
        :class="field"
        @change="patch({ domain: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="d in domains" :key="d" :value="d" class="capitalize">{{ d }}</option>
      </select>
    </div>

    <!-- client-side row filter -->
    <div class="space-y-1.5">
      <label class="flex items-center gap-1 text-xs font-medium text-muted">
        <Search class="size-3" /> Filter rows
      </label>
      <Input
        :model-value="rowFilter"
        placeholder="Search results…"
        @update:model-value="emit('update:rowFilter', String($event))"
      />
    </div>

    <!-- actions -->
    <div class="flex flex-wrap gap-2 border-t border-border pt-3">
      <Button size="sm" :loading="loading" @click="emit('run')">
        <RefreshCw class="size-4" /> Run
      </Button>
      <Button v-if="canSchedule" variant="outline" size="sm" @click="emit('save')">
        <Bookmark class="size-4" /> Save
      </Button>
      <Button v-if="exportable && canExport" variant="outline" size="sm" @click="emit('export')">
        <Download class="size-4" /> Export
      </Button>
    </div>
  </div>
</template>
