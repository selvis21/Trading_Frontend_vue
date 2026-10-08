<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onKeyStroke } from '@vueuse/core';
import { Link } from '@inertiajs/vue3';
import { Columns3, History, StickyNote, ListTree, LayoutDashboard } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import TransactionQueue from '@/components/finance/TransactionQueue.vue';
import TransactionDetailPanel from '@/components/finance/TransactionDetailPanel.vue';
import FinanceTimelinePanel from '@/components/finance/FinanceTimelinePanel.vue';
import FinanceNotesPanel from '@/components/finance/FinanceNotesPanel.vue';
import TransactionStatusHistoryPanel from '@/components/finance/TransactionStatusHistoryPanel.vue';
import { cn } from '@/lib/utils';
import { useTransactions, useTransaction } from '@/queries/finance';
import {
  TRANSACTION_VIEW_FILTER,
  type TransactionView,
  type FinanceTransaction,
} from '@/types/finance';

/* Finance operations workspace — the three-panel cockpit.
 *  LEFT   Transaction Queue (views, j/k navigation)
 *  CENTER Transaction Detail · Client Summary · Trading Account Summary
 *  RIGHT  Timeline (activities) · Notes · Status History
 */
defineOptions({ layout: null });

const view = ref<TransactionView>('pending');
const pageSize = ref(25);
const selectedId = ref<number | null>(null);

const params = computed(() => ({
  ...TRANSACTION_VIEW_FILTER[view.value],
  page_size: pageSize.value,
}));
const list = useTransactions(params);
const transactions = computed(() => list.data.value?.rows ?? []);
const hasMore = computed(
  () => transactions.value.length < (list.data.value?.total ?? 0),
);

const detail = useTransaction(selectedId);
const activeTxn = computed<FinanceTransaction | null>(
  () => detail.data.value ?? transactions.value.find((t) => t.id === selectedId.value) ?? null,
);
const activeClientId = computed(() => activeTxn.value?.client_id ?? null);

watch(view, () => (selectedId.value = null));
watch(transactions, (rows) => {
  if (selectedId.value === null && rows.length) selectedId.value = rows[0].id;
});

function select(txn: FinanceTransaction) {
  selectedId.value = txn.id;
}

function move(delta: number) {
  const i = transactions.value.findIndex((t) => t.id === selectedId.value);
  const next = transactions.value[Math.max(0, Math.min(transactions.value.length - 1, i + delta))];
  if (next) selectedId.value = next.id;
}
onKeyStroke(['j', 'J'], (e) => {
  if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
  move(1);
});
onKeyStroke(['k', 'K'], (e) => {
  if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
  move(-1);
});

const rightTab = ref<'timeline' | 'notes' | 'history'>('timeline');
const rightTabs = [
  { key: 'timeline' as const, label: 'Timeline', icon: ListTree },
  { key: 'notes' as const, label: 'Notes', icon: StickyNote },
  { key: 'history' as const, label: 'Status History', icon: History },
];

function onChanged() {
  list.refetch();
  detail.refetch();
}
</script>

<template>
  <AppLayout>
    <div class="flex h-[calc(100dvh-3.5rem)] flex-col">
      <header class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div class="flex items-center gap-2.5">
          <Columns3 class="size-5 text-primary" />
          <div>
            <h1 class="text-lg font-semibold tracking-tight text-fg">Finance Workspace</h1>
            <p class="text-xs text-muted">Transaction cockpit · <kbd class="font-mono">j</kbd>/<kbd class="font-mono">k</kbd> to navigate</p>
          </div>
        </div>
        <Link href="/finance/dashboard">
          <Button variant="outline" size="sm"><LayoutDashboard class="size-4" /> Dashboard</Button>
        </Link>
      </header>

      <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
        <!-- LEFT: transaction queue -->
        <div class="h-72 shrink-0 border-b border-border lg:h-auto lg:w-80 lg:border-b-0 lg:border-e">
          <TransactionQueue
            :transactions="transactions"
            :loading="list.isLoading.value"
            :view="view"
            :selected-id="selectedId"
            :total="list.data.value?.total"
            :has-more="hasMore"
            @update:view="view = $event"
            @select="select"
            @load-more="pageSize += 25"
          />
        </div>

        <!-- CENTER: detail + client + trading account summary -->
        <div class="min-h-0 flex-1 border-b border-border lg:border-b-0 lg:border-e">
          <TransactionDetailPanel
            v-if="selectedId"
            :key="selectedId"
            :transaction-id="selectedId"
            :fallback="activeTxn"
            @changed="onChanged"
          />
          <div v-else class="flex h-full items-center justify-center text-sm text-muted">
            Select a transaction to begin.
          </div>
        </div>

        <!-- RIGHT: timeline / notes / status history -->
        <aside class="flex h-96 shrink-0 flex-col lg:h-auto lg:w-96">
          <div class="flex shrink-0 gap-1 border-b border-border p-2">
            <button
              v-for="t in rightTabs"
              :key="t.key"
              :class="
                cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  rightTab === t.key ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
                )
              "
              @click="rightTab = t.key"
            >
              <component :is="t.icon" class="size-3.5" /> {{ t.label }}
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-3">
            <template v-if="selectedId && activeClientId">
              <FinanceTimelinePanel v-if="rightTab === 'timeline'" :key="`a${activeClientId}`" :client-id="activeClientId" />
              <FinanceNotesPanel v-else-if="rightTab === 'notes'" :key="`n${activeClientId}`" :client-id="activeClientId" :transaction-id="selectedId" />
              <TransactionStatusHistoryPanel v-else :key="`h${selectedId}`" :transaction-id="selectedId" />
            </template>
            <div v-else class="flex h-full items-center justify-center text-center text-sm text-muted">
              No transaction selected.
            </div>
          </div>
        </aside>
      </div>
    </div>
  </AppLayout>
</template>
