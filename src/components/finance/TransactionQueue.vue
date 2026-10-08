<script setup lang="ts">
import { Wallet as WalletIcon, Hash } from '@lucide/vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import TransactionTypeBadge from './TransactionTypeBadge.vue';
import MoneyAmount from './MoneyAmount.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Button from '@/components/ui/Button.vue';
import { cn, timeAgo } from '@/lib/utils';
import type { FinanceTransaction, TransactionView } from '@/types/finance';

/* Left panel of the transaction workspace: a view-tabbed queue. Money is
 * rendered through MoneyAmount (integer minor units only). j/k advances. */
defineProps<{
  transactions: FinanceTransaction[];
  loading?: boolean;
  view: TransactionView;
  selectedId: number | null;
  total?: number;
  hasMore?: boolean;
}>();
const emit = defineEmits<{
  'update:view': [v: TransactionView];
  select: [transaction: FinanceTransaction];
  loadMore: [];
}>();

const views: { key: TransactionView; label: string }[] = [
  { key: 'pending', label: 'Pending Approval' },
  { key: 'deposits', label: 'Deposits' },
  { key: 'withdrawals', label: 'Withdrawals' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'credits', label: 'Credits' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const OUTFLOW = new Set(['withdrawal']);
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
            view === v.key ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
          )
        "
        @click="emit('update:view', v.key)"
      >
        {{ v.label }}
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto p-2">
      <SkeletonList v-if="loading && !transactions.length" :rows="7" />
      <EmptyState
        v-else-if="!transactions.length"
        :icon="WalletIcon"
        title="No transactions"
        description="No transactions in this view."
        class="border-0"
      />
      <ul v-else class="space-y-1.5">
        <li v-for="txn in transactions" :key="txn.id">
          <button
            :class="
              cn(
                'w-full rounded-lg border p-2.5 text-start transition-colors',
                selectedId === txn.id ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-muted-surface/50',
              )
            "
            @click="emit('select', txn)"
          >
            <div class="flex items-center justify-between gap-2">
              <TransactionTypeBadge :type="txn.type" />
              <StatusBadge :status="txn.status" />
            </div>
            <div class="mt-1.5 flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1 text-xs text-muted">
                <Hash class="size-3" /> Client {{ txn.client_id }}
              </span>
              <MoneyAmount
                :minor="txn.amount"
                :currency-id="txn.currency_id"
                :direction="txn.type && OUTFLOW.has(txn.type) ? 'out' : 'in'"
                colored
                strong
              />
            </div>
            <div class="mt-1 text-[11px] text-muted">{{ timeAgo(txn.created_at) }}</div>
          </button>
        </li>
      </ul>

      <div v-if="hasMore" class="mt-2 flex justify-center">
        <Button variant="ghost" size="sm" @click="emit('loadMore')">Load more</Button>
      </div>
      <p v-if="transactions.length && total" class="mt-2 text-center text-[11px] text-muted">
        {{ transactions.length }} of {{ total }} shown
      </p>
    </div>
  </div>
</template>
