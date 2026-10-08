<script setup lang="ts">
import { computed } from 'vue';
import { LineChart, Hash } from '@lucide/vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AccountTypePill from './AccountTypePill.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Button from '@/components/ui/Button.vue';
import { cn, timeAgo } from '@/lib/utils';
import type { AccountView, TradingAccount } from '@/types/trading';

/* Left panel: the trading-account queue with status-view tabs. Accounts
 * are labelled by login (mono identity) + client id; the queue is the
 * spine of the keyboard-driven workspace (j/k to advance). */
const props = defineProps<{
  accounts: TradingAccount[];
  loading?: boolean;
  view: AccountView;
  selectedId: number | null;
  total?: number;
  hasMore?: boolean;
}>();
const emit = defineEmits<{
  'update:view': [v: AccountView];
  select: [account: TradingAccount];
  loadMore: [];
}>();

const views: { key: AccountView; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'closed', label: 'Closed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const count = computed(() => props.accounts.length);
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
      <SkeletonList v-if="loading && !accounts.length" :rows="6" />
      <EmptyState
        v-else-if="!accounts.length"
        :icon="LineChart"
        title="No accounts"
        description="No trading accounts in this view."
        class="border-0"
      />
      <ul v-else class="space-y-1.5">
        <li v-for="account in accounts" :key="account.id">
          <button
            :class="
              cn(
                'w-full rounded-lg border p-2.5 text-start transition-colors',
                selectedId === account.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface hover:bg-muted-surface/50',
              )
            "
            @click="emit('select', account)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate font-mono text-sm font-medium text-fg" dir="ltr">
                {{ account.login ?? `#${account.id}` }}
              </span>
              <StatusBadge :status="account.status" />
            </div>
            <div class="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted">
              <span class="inline-flex items-center gap-1">
                <Hash class="size-3" /> Client {{ account.client_id }}
                <AccountTypePill :type="account.account_type" />
              </span>
              <span class="tabular-nums">1:{{ account.leverage ?? '—' }}</span>
            </div>
            <div class="mt-1 text-[11px] text-muted">
              {{ timeAgo(account.opened_at ?? account.created_at) }}
            </div>
          </button>
        </li>
      </ul>

      <div v-if="hasMore" class="mt-2 flex justify-center">
        <Button variant="ghost" size="sm" @click="emit('loadMore')">Load more</Button>
      </div>
      <p v-if="accounts.length" class="mt-2 text-center text-[11px] text-muted">
        {{ count }}<template v-if="total"> of {{ total }}</template> shown
      </p>
    </div>
  </div>
</template>
