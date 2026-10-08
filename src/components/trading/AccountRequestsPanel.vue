<script setup lang="ts">
import { computed } from 'vue';
import { Inbox } from '@lucide/vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AccountTypePill from './AccountTypePill.vue';
import RequestActions from './RequestActions.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { cn, timeAgo } from '@/lib/utils';
import { useTradingRequests } from '@/queries/trading';

/* Open-account requests for one client. Used by the account-detail
 * "Requests" tab and the workspace right rail. The request tied to the
 * focused account (if any) is highlighted. Pending requests expose inline
 * decision actions. */
const props = defineProps<{
  clientId: number;
  /** Highlight the request that provisioned this account. */
  accountId?: number | null;
}>();

const q = useTradingRequests(() => ({ client_id: props.clientId, page_size: 50 }));
const rows = computed(() => q.data.value?.rows ?? []);
</script>

<template>
  <div>
    <SkeletonList v-if="q.isLoading.value" :rows="3" />
    <EmptyState
      v-else-if="!rows.length"
      :icon="Inbox"
      title="No requests"
      description="This client has no open-account requests."
      class="border-0"
    />
    <ul v-else class="space-y-2">
      <li
        v-for="r in rows"
        :key="r.id"
        :class="
          cn(
            'rounded-lg border bg-surface p-3',
            accountId && r.trading_account_id === accountId
              ? 'border-primary'
              : 'border-border',
          )
        "
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-fg">Request #{{ r.id }}</span>
            <AccountTypePill :type="r.account_type" />
          </div>
          <StatusBadge :status="r.status" />
        </div>
        <div class="mt-1 flex items-center gap-3 text-xs text-muted">
          <span class="tabular-nums">Leverage 1:{{ r.requested_leverage ?? '—' }}</span>
          <span>{{ timeAgo(r.created_at) }}</span>
        </div>
        <p v-if="r.decision_reason" class="mt-1.5 text-sm text-muted">{{ r.decision_reason }}</p>
        <div v-if="r.status === 'pending'" class="mt-2">
          <RequestActions :request="r" layout="bar" @changed="q.refetch()" />
        </div>
      </li>
    </ul>
  </div>
</template>
