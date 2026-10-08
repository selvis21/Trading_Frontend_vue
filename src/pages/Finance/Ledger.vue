<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import { router } from '@inertiajs/vue3';
import type { ColumnDef } from '@tanstack/vue-table';
import { Receipt } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DataTable from '@/components/data/DataTable.vue';
import Badge from '@/components/ui/Badge.vue';
import MoneyAmount from '@/components/finance/MoneyAmount.vue';
import { cn, timeAgo } from '@/lib/utils';
import { useLedger } from '@/queries/finance';
import type { LedgerEntry, LedgerEntryKind } from '@/types/finance';

/* Universal ledger — the immutable, append-only money record (the auditor's
 * view). Every money cell is integer minor units via MoneyAmount; rows are
 * read-only. Filterable by entry kind. */
defineOptions({ layout: null });

const kind = ref<LedgerEntryKind | ''>('');
const page = ref(1);
watch(kind, () => (page.value = 1));

const params = computed(() => ({
  kind: kind.value || undefined,
  page: page.value,
  page_size: 50,
}));
const list = useLedger(params);
const rows = computed(() => list.data.value?.rows ?? []);

const kinds: { value: LedgerEntryKind | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'transfer_in', label: 'Transfer in' },
  { value: 'transfer_out', label: 'Transfer out' },
  { value: 'credit', label: 'Credit' },
  { value: 'fee', label: 'Fee' },
  { value: 'adjustment', label: 'Adjustment' },
];

function kindLabel(k: string | null): string {
  return (k ?? '—').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const columns: ColumnDef<LedgerEntry, any>[] = [
  {
    accessorKey: 'kind',
    header: 'Kind',
    cell: ({ row }) => h('span', { class: 'font-medium text-fg' }, kindLabel(row.original.kind)),
  },
  {
    accessorKey: 'balance_type',
    header: 'Balance',
    cell: ({ row }) =>
      h(Badge, { tone: row.original.balance_type === 'credit' ? 'accent' : 'neutral' }, () =>
        row.original.balance_type === 'credit' ? 'Credit' : 'Cash',
      ),
  },
  {
    accessorKey: 'client_id',
    header: 'Client',
    cell: ({ row }) => h('span', { class: 'text-muted' }, `#${row.original.client_id}`),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) =>
      h(MoneyAmount, {
        minor: row.original.amount,
        currencyId: row.original.currency_id,
        direction: row.original.direction === 'credit' ? 'in' : 'out',
        colored: true,
        strong: true,
      }),
  },
  {
    accessorKey: 'balance_after',
    header: 'Balance after',
    cell: ({ row }) =>
      h(MoneyAmount, { minor: row.original.balance_after, currencyId: row.original.currency_id }),
  },
  {
    accessorKey: 'created_at',
    header: 'When',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted' }, timeAgo(row.original.created_at)),
  },
];
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header class="flex items-center gap-2.5">
        <Receipt class="size-5 text-primary" />
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-fg">Universal Ledger</h1>
          <p class="text-sm text-muted">Append-only — entries cannot be edited.</p>
        </div>
      </header>

      <div class="flex gap-1 overflow-x-auto">
        <button
          v-for="k in kinds"
          :key="k.value"
          :class="
            cn(
              'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              kind === k.value ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
            )
          "
          @click="kind = k.value"
        >
          {{ k.label }}
        </button>
      </div>

      <DataTable
        :data="rows"
        :columns="columns"
        :loading="list.isLoading.value"
        :error="list.isError.value"
        :page="page"
        :page-size="50"
        :total="list.data.value?.total ?? 0"
        :last-page="list.data.value?.last_page ?? 1"
        :row-key="(r) => r.id"
        empty-title="No ledger entries"
        empty-description="No entries match this filter."
        @update:page="page = $event"
        @row-click="(r) => router.visit(`/finance/transactions/${r.finance_transaction_id}`)"
        @retry="list.refetch()"
      />
    </div>
  </AppLayout>
</template>
