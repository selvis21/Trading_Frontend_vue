<script setup lang="ts">
import { computed, ref, watch, h, defineAsyncComponent } from 'vue';
import { Link } from '@inertiajs/vue3';
import type { ColumnDef } from '@tanstack/vue-table';
import { Wallet as WalletIcon, Plus, ArrowLeftRight, Gift, Columns3, LayoutDashboard } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DataTable from '@/components/data/DataTable.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Button from '@/components/ui/Button.vue';
import TransactionTypeBadge from '@/components/finance/TransactionTypeBadge.vue';
import MoneyAmount from '@/components/finance/MoneyAmount.vue';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useTransactions } from '@/queries/finance';
import {
  TRANSACTION_VIEW_FILTER,
  type TransactionView,
  type FinanceTransaction,
} from '@/types/finance';

/* Finance transactions list. Views (Pending Approval / Deposits /
 * Withdrawals / Transfers / Credits / Rejected / All) over a DataTable with
 * drawer-first rows. All money via MoneyAmount (integer minor units). The
 * detail + create/transfer/credit drawers are lazy-loaded. */
defineOptions({ layout: null });

const props = defineProps<{ view?: TransactionView }>();

const TransactionDetailDrawer = defineAsyncComponent(
  () => import('@/components/finance/TransactionDetailDrawer.vue'),
);
const CreateTransactionDrawer = defineAsyncComponent(
  () => import('@/components/finance/CreateTransactionDrawer.vue'),
);
const TransferDrawer = defineAsyncComponent(
  () => import('@/components/finance/TransferDrawer.vue'),
);
const CreditDialog = defineAsyncComponent(
  () => import('@/components/finance/CreditDialog.vue'),
);

const auth = useAuthStore();
const view = ref<TransactionView>(props.view ?? 'pending');
const page = ref(1);
watch(view, () => (page.value = 1));

const params = computed(() => ({
  ...TRANSACTION_VIEW_FILTER[view.value],
  page: page.value,
  page_size: 25,
}));
const list = useTransactions(params);
const rows = computed(() => list.data.value?.rows ?? []);

const views: { key: TransactionView; label: string }[] = [
  { key: 'pending', label: 'Pending Approval' },
  { key: 'deposits', label: 'Deposits' },
  { key: 'withdrawals', label: 'Withdrawals' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'credits', label: 'Credits' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const columns: ColumnDef<FinanceTransaction, any>[] = [
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => h(TransactionTypeBadge, { type: row.original.type }),
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
        direction: row.original.type === 'withdrawal' ? 'out' : 'in',
        colored: true,
        strong: true,
      }),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(StatusBadge, { status: row.original.status }),
  },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-xs text-muted', dir: 'ltr' }, row.original.reference ?? '—'),
  },
];

const detailOpen = ref(false);
const activeTxn = ref<FinanceTransaction | null>(null);
function openDrawer(txn: FinanceTransaction) {
  activeTxn.value = txn;
  detailOpen.value = true;
}

const createOpen = ref(false);
const transferOpen = ref(false);
const creditOpen = ref(false);
const creditClientId = ref<number | null>(null);

const canCreate = computed(
  () => auth.can('finance.deposits.create') || auth.can('finance.withdrawals.create'),
);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <WalletIcon class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Transactions</h1>
            <p class="text-sm text-muted">Deposits, withdrawals, transfers and credits.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Link href="/finance/dashboard">
            <Button variant="outline" size="sm"><LayoutDashboard class="size-4" /> Dashboard</Button>
          </Link>
          <Link href="/finance/workspace">
            <Button variant="outline" size="sm"><Columns3 class="size-4" /> Workspace</Button>
          </Link>
          <Button v-if="auth.can('finance.credit.manage')" variant="outline" size="sm" @click="creditOpen = true">
            <Gift class="size-4" /> Credit
          </Button>
          <Button v-if="auth.can('finance.transfers.create')" variant="outline" size="sm" @click="transferOpen = true">
            <ArrowLeftRight class="size-4" /> Transfer
          </Button>
          <Button v-if="canCreate" size="sm" @click="createOpen = true">
            <Plus class="size-4" /> New transaction
          </Button>
        </div>
      </header>

      <div class="flex gap-1 overflow-x-auto">
        <button
          v-for="v in views"
          :key="v.key"
          :class="
            cn(
              'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              view === v.key ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
            )
          "
          @click="view = v.key"
        >
          {{ v.label }}
        </button>
      </div>

      <DataTable
        :data="rows"
        :columns="columns"
        :loading="list.isLoading.value"
        :error="list.isError.value"
        :page="page"
        :page-size="25"
        :total="list.data.value?.total ?? 0"
        :last-page="list.data.value?.last_page ?? 1"
        :row-key="(r) => r.id"
        empty-title="No transactions"
        empty-description="No transactions match this view."
        @update:page="page = $event"
        @row-click="openDrawer"
        @retry="list.refetch()"
      />
    </div>

    <TransactionDetailDrawer
      :open="detailOpen"
      :transaction="activeTxn"
      @update:open="detailOpen = $event"
      @changed="list.refetch()"
    />
    <CreateTransactionDrawer :open="createOpen" @update:open="createOpen = $event" @created="list.refetch()" />
    <TransferDrawer :open="transferOpen" @update:open="transferOpen = $event" @done="list.refetch()" />
    <CreditDialog :open="creditOpen" :client-id="creditClientId" @update:open="creditOpen = $event" @done="list.refetch()" />
  </AppLayout>
</template>
