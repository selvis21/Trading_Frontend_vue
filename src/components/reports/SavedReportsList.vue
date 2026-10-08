<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { Bookmark, Trash2, Play } from '@lucide/vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { useReportHistory } from '@/composables/useReportHistory';
import type { ReportFilters, SavedReportView } from '@/types/reports';

/* Saved report views — named filter presets persisted client-side. Running
 * one deep-links to the viewer with the filters as URL query (so the run is
 * reproducible and shareable). */
const { savedViews, removeView } = useReportHistory();

function queryString(filters: ReportFilters): string {
  const p = new URLSearchParams();
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);
  if (filters.business_unit_id != null) p.set('business_unit_id', String(filters.business_unit_id));
  if (filters.domain) p.set('domain', filters.domain);
  const s = p.toString();
  return s ? `?${s}` : '';
}

function run(view: SavedReportView) {
  router.visit(`/reports/view/${view.report_key}${queryString(view.filters)}`);
}
</script>

<template>
  <div>
    <EmptyState
      v-if="!savedViews.length"
      :icon="Bookmark"
      title="No saved reports"
      description="Save a report's filters from the viewer to pin it here."
      class="border-0"
    />
    <ul v-else class="space-y-2">
      <li
        v-for="v in savedViews"
        :key="v.id"
        class="group flex items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
      >
        <button class="min-w-0 flex-1 text-start" @click="run(v)">
          <p class="truncate text-sm font-medium text-fg">{{ v.name }}</p>
          <p class="truncate font-mono text-xs text-muted" dir="ltr">{{ v.report_key }}</p>
        </button>
        <div class="flex items-center gap-1">
          <button class="rounded-md p-1.5 text-muted hover:bg-muted-surface hover:text-primary" aria-label="Run" @click="run(v)">
            <Play class="size-4" />
          </button>
          <button
            class="rounded-md p-1.5 text-muted opacity-0 transition-opacity hover:bg-muted-surface hover:text-status-danger group-hover:opacity-100"
            aria-label="Delete saved report"
            @click="removeView(v.id)"
          >
            <Trash2 class="size-4" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
