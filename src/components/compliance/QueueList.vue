<script setup lang="ts">
import { computed } from 'vue';
import { FileText } from '@lucide/vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import SlaIndicator from './SlaIndicator.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Button from '@/components/ui/Button.vue';
import { cn, timeAgo } from '@/lib/utils';
import type { KycApplication, QueueView } from '@/types/compliance';

/* Left panel: the KYC application queue with status-view tabs. Rows are
 * identified by client_id (the compliance API exposes no client name). */
const props = defineProps<{
  applications: KycApplication[];
  loading?: boolean;
  view: QueueView;
  selectedId: number | null;
  total?: number;
  hasMore?: boolean;
}>();
const emit = defineEmits<{
  'update:view': [v: QueueView];
  select: [app: KycApplication];
  loadMore: [];
}>();

const views: { key: QueueView; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_review', label: 'In review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

function docCount(a: KycApplication) {
  return a.documents?.length ?? 0;
}
const showSla = computed(() => ['pending', 'in_review'].includes(props.view));
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- view tabs -->
    <div class="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2">
      <button
        v-for="v in views"
        :key="v.key"
        :class="
          cn(
            'whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            view === v.key
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:bg-muted-surface hover:text-fg',
          )
        "
        @click="emit('update:view', v.key)"
      >
        {{ v.label }}
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto p-2">
      <SkeletonList v-if="loading && !applications.length" :rows="6" />
      <EmptyState
        v-else-if="!applications.length"
        :icon="FileText"
        title="Queue is empty"
        description="No applications in this view."
        class="border-0"
      />
      <ul v-else class="space-y-1.5">
        <li v-for="app in applications" :key="app.id">
          <button
            :class="
              cn(
                'w-full rounded-lg border p-2.5 text-start transition-colors',
                selectedId === app.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface hover:bg-muted-surface/50',
              )
            "
            @click="emit('select', app)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium text-fg">Client #{{ app.client_id }}</span>
              <StatusBadge :status="app.status" />
            </div>
            <div class="mt-1.5 flex items-center justify-between text-xs text-muted">
              <span class="inline-flex items-center gap-1">
                <FileText class="size-3" /> {{ docCount(app) }} docs · attempt {{ app.attempt }}
              </span>
              <SlaIndicator v-if="showSla" :since="app.submitted_at" />
              <span v-else>{{ timeAgo(app.submitted_at ?? app.created_at) }}</span>
            </div>
          </button>
        </li>
      </ul>

      <div v-if="hasMore" class="mt-2 flex justify-center">
        <Button variant="ghost" size="sm" @click="emit('loadMore')">Load more</Button>
      </div>
    </div>
  </div>
</template>
