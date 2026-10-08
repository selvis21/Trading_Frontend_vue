<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { Download, FileSpreadsheet, ExternalLink, Trash2 } from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { timeAgo } from '@/lib/utils';
import { useReportHistory } from '@/composables/useReportHistory';

/* Export history — a client-side record of completed CSV exports (the
 * backend keeps none). Re-export by opening the report viewer for that key. */
defineProps<{ open: boolean }>();
const emit = defineEmits<{ 'update:open': [v: boolean] }>();

const { exports, clearExports } = useReportHistory();
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="28rem"
    title="Export history"
    description="Your recent CSV exports (kept on this device)."
    @update:open="emit('update:open', $event)"
  >
    <EmptyState
      v-if="!exports.length"
      :icon="Download"
      title="No exports yet"
      description="CSV exports you download will be listed here."
      class="border-0"
    />
    <ul v-else class="space-y-2">
      <li
        v-for="e in exports"
        :key="e.id"
        class="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
      >
        <div class="flex min-w-0 items-center gap-2">
          <FileSpreadsheet class="size-4 shrink-0 text-status-success" />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-fg">{{ e.title }}</p>
            <p class="truncate font-mono text-xs text-muted" dir="ltr">{{ e.filename }}</p>
            <p class="text-xs text-muted">{{ timeAgo(e.at) }}</p>
          </div>
        </div>
        <button
          class="shrink-0 rounded-md p-1.5 text-muted hover:bg-muted-surface hover:text-primary"
          aria-label="Open report"
          @click="router.visit(`/reports/view/${e.report_key}`)"
        >
          <ExternalLink class="size-4" />
        </button>
      </li>
    </ul>

    <template v-if="exports.length" #footer>
      <div class="flex justify-end">
        <Button variant="ghost" size="sm" @click="clearExports">
          <Trash2 class="size-4" /> Clear history
        </Button>
      </div>
    </template>
  </Sheet>
</template>
