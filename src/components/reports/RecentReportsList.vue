<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { History, ChevronRight } from '@lucide/vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { timeAgo } from '@/lib/utils';
import { useReportHistory } from '@/composables/useReportHistory';

/* Recently-run reports (MRU, client-side). */
const { recents } = useReportHistory();
</script>

<template>
  <div>
    <EmptyState
      v-if="!recents.length"
      :icon="History"
      title="No recent reports"
      description="Reports you run will appear here."
      class="border-0"
    />
    <ul v-else class="divide-y divide-border rounded-lg border border-border bg-surface">
      <li v-for="r in recents" :key="r.report_key">
        <button
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start transition-colors hover:bg-muted-surface/50"
          @click="router.visit(`/reports/view/${r.report_key}`)"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-fg">{{ r.title }}</p>
            <p class="text-xs text-muted">{{ timeAgo(r.at) }}</p>
          </div>
          <ChevronRight class="size-4 shrink-0 text-muted" />
        </button>
      </li>
    </ul>
  </div>
</template>
