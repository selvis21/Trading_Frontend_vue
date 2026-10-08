<script setup lang="ts">
import { computed, ref } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ArrowLeft, Info, Receipt, History, StickyNote, ListTree } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import TransactionDetailPanel from '@/components/finance/TransactionDetailPanel.vue';
import TransactionLedgerPanel from '@/components/finance/TransactionLedgerPanel.vue';
import TransactionStatusHistoryPanel from '@/components/finance/TransactionStatusHistoryPanel.vue';
import FinanceNotesPanel from '@/components/finance/FinanceNotesPanel.vue';
import FinanceTimelinePanel from '@/components/finance/FinanceTimelinePanel.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { cn } from '@/lib/utils';
import { useTransaction } from '@/queries/finance';

/* Full-page transaction detail. Tabs: Overview (detail + client + trading
 * account summary + actions), Ledger Entries, Status History, Notes,
 * Activities. `transactionId` comes from the route. */
defineOptions({ layout: null });

const props = defineProps<{ transactionId: number }>();
const txn = useTransaction(() => props.transactionId);
const clientId = computed(() => txn.data.value?.client_id ?? null);

type Tab = 'overview' | 'ledger' | 'history' | 'notes' | 'activities';
const tab = ref<Tab>('overview');
const tabs: { key: Tab; label: string; icon: typeof Info }[] = [
  { key: 'overview', label: 'Overview', icon: Info },
  { key: 'ledger', label: 'Ledger Entries', icon: Receipt },
  { key: 'history', label: 'Status History', icon: History },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'activities', label: 'Activities', icon: ListTree },
];
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-5xl p-4 sm:p-6">
      <Link href="/finance/transactions" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft class="size-4" /> Back to transactions
      </Link>

      <div v-if="txn.isLoading.value && !txn.data.value" class="flex h-64 items-center justify-center">
        <Spinner label="Loading transaction…" />
      </div>

      <template v-else>
        <nav class="mb-4 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
          <button
            v-for="t in tabs"
            :key="t.key"
            role="tab"
            :aria-selected="tab === t.key"
            :class="
              cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                tab === t.key ? 'border-primary text-fg' : 'border-transparent text-muted hover:text-fg',
              )
            "
            @click="tab = t.key"
          >
            <component :is="t.icon" class="size-4" /> {{ t.label }}
          </button>
        </nav>

        <div v-if="tab === 'overview'" class="rounded-lg border border-border bg-surface">
          <TransactionDetailPanel :transaction-id="transactionId" @changed="txn.refetch()" />
        </div>
        <TransactionLedgerPanel v-else-if="tab === 'ledger'" :transaction-id="transactionId" />
        <TransactionStatusHistoryPanel v-else-if="tab === 'history'" :transaction-id="transactionId" />
        <FinanceNotesPanel v-else-if="tab === 'notes' && clientId" :client-id="clientId" :transaction-id="transactionId" />
        <FinanceTimelinePanel v-else-if="tab === 'activities' && clientId" :client-id="clientId" />
      </template>
    </div>
  </AppLayout>
</template>
