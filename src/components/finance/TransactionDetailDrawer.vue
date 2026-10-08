<script setup lang="ts">
import { ref, watch } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ExternalLink, Receipt, History, StickyNote, ListTree } from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import TransactionDetailPanel from './TransactionDetailPanel.vue';
import TransactionLedgerPanel from './TransactionLedgerPanel.vue';
import TransactionStatusHistoryPanel from './TransactionStatusHistoryPanel.vue';
import FinanceNotesPanel from './FinanceNotesPanel.vue';
import FinanceTimelinePanel from './FinanceTimelinePanel.vue';
import { cn } from '@/lib/utils';
import type { FinanceTransaction } from '@/types/finance';

/* Drawer-first transaction view: the detail 360° over a tabbed rail
 * (Ledger · Status History · Notes · Activities). Keeps the operator in
 * the queue while acting. */
const props = defineProps<{
  open: boolean;
  transaction: FinanceTransaction | null;
}>();
const emit = defineEmits<{ 'update:open': [v: boolean]; changed: [] }>();

type Tab = 'ledger' | 'history' | 'notes' | 'activities';
const tab = ref<Tab>('ledger');
const tabs: { key: Tab; label: string; icon: typeof Receipt }[] = [
  { key: 'ledger', label: 'Ledger', icon: Receipt },
  { key: 'history', label: 'Status', icon: History },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'activities', label: 'Activities', icon: ListTree },
];

watch(
  () => props.transaction?.id,
  () => (tab.value = 'ledger'),
);
</script>

<template>
  <Sheet :open="open" side="right" width="46rem" @update:open="emit('update:open', $event)">
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold text-fg">
            Transaction #{{ transaction?.id }}
          </h2>
          <p class="truncate text-xs text-muted">Client #{{ transaction?.client_id }}</p>
        </div>
        <Link
          v-if="transaction"
          :href="`/finance/transactions/${transaction.id}`"
          class="inline-flex shrink-0 items-center gap-1 text-xs text-muted hover:text-fg"
        >
          <ExternalLink class="size-3.5" /> Full page
        </Link>
      </div>
    </template>

    <div v-if="transaction" class="-mx-5 -my-4">
      <TransactionDetailPanel
        :key="transaction.id"
        :transaction-id="transaction.id"
        :fallback="transaction"
        @changed="emit('changed')"
      />

      <div class="border-t border-border">
        <div class="flex gap-1 border-b border-border p-2">
          <button
            v-for="tb in tabs"
            :key="tb.key"
            :class="
              cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                tab === tb.key ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
              )
            "
            @click="tab = tb.key"
          >
            <component :is="tb.icon" class="size-3.5" /> {{ tb.label }}
          </button>
        </div>
        <div class="p-4">
          <TransactionLedgerPanel v-if="tab === 'ledger'" :key="`l${transaction.id}`" :transaction-id="transaction.id" />
          <TransactionStatusHistoryPanel v-else-if="tab === 'history'" :key="`h${transaction.id}`" :transaction-id="transaction.id" />
          <FinanceNotesPanel v-else-if="tab === 'notes'" :key="`n${transaction.id}`" :client-id="transaction.client_id" :transaction-id="transaction.id" />
          <FinanceTimelinePanel v-else :key="`a${transaction.id}`" :client-id="transaction.client_id" />
        </div>
      </div>
    </div>
  </Sheet>
</template>
