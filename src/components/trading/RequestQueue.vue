<script setup lang="ts">
import { Inbox } from '@lucide/vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AccountTypePill from './AccountTypePill.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Button from '@/components/ui/Button.vue';
import { cn, timeAgo } from '@/lib/utils';
import type { RequestView, TradingAccountRequest } from '@/types/trading';

/* Left panel of the open-account request inbox. Pending-first queue with
 * status-view tabs; j/k advances through it hands-free. */
defineProps<{
  requests: TradingAccountRequest[];
  loading?: boolean;
  view: RequestView;
  selectedId: number | null;
  hasMore?: boolean;
}>();
const emit = defineEmits<{
  'update:view': [v: RequestView];
  select: [request: TradingAccountRequest];
  loadMore: [];
}>();

const views: { key: RequestView; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];
</script>

<template>
  <div class="flex h-full flex-col">
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
      <SkeletonList v-if="loading && !requests.length" :rows="6" />
      <EmptyState
        v-else-if="!requests.length"
        :icon="Inbox"
        title="Queue is empty"
        description="No open-account requests in this view."
        class="border-0"
      />
      <ul v-else class="space-y-1.5">
        <li v-for="r in requests" :key="r.id">
          <button
            :class="
              cn(
                'w-full rounded-lg border p-2.5 text-start transition-colors',
                selectedId === r.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface hover:bg-muted-surface/50',
              )
            "
            @click="emit('select', r)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium text-fg">Client #{{ r.client_id }}</span>
              <StatusBadge :status="r.status" />
            </div>
            <div class="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted">
              <span class="inline-flex items-center gap-1.5">
                Request #{{ r.id }} <AccountTypePill :type="r.account_type" />
              </span>
              <span class="tabular-nums">1:{{ r.requested_leverage ?? '—' }}</span>
            </div>
            <div class="mt-1 text-[11px] text-muted">{{ timeAgo(r.created_at) }}</div>
          </button>
        </li>
      </ul>

      <div v-if="hasMore" class="mt-2 flex justify-center">
        <Button variant="ghost" size="sm" @click="emit('loadMore')">Load more</Button>
      </div>
    </div>
  </div>
</template>
