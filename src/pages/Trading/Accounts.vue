<script setup lang="ts">
import { computed, ref, watch, h, defineAsyncComponent } from 'vue';
import { Link } from '@inertiajs/vue3';
import type { ColumnDef } from '@tanstack/vue-table';
import { LineChart, Plus, Columns3, Inbox } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DataTable from '@/components/data/DataTable.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Button from '@/components/ui/Button.vue';
import AccountTypePill from '@/components/trading/AccountTypePill.vue';
import AccountMetricsCards from '@/components/trading/AccountMetricsCards.vue';
import AccountDistribution from '@/components/trading/AccountDistribution.vue';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useTradingAccounts } from '@/queries/trading';
import {
  ACCOUNT_VIEW_STATUS,
  type AccountView,
  type TradingAccount,
} from '@/types/trading';

/* Trading accounts list. Status views (Active/Pending/Suspended/Closed/
 * Rejected/All) over the KPI row + distribution charts, with a drawer-first
 * row interaction so the operator never leaves the list to act. The detail
 * drawer is lazy-loaded (it only mounts on first open). */
defineOptions({ layout: null });

const AccountDetailDrawer = defineAsyncComponent(
  () => import('@/components/trading/AccountDetailDrawer.vue'),
);
const NewAccountDrawer = defineAsyncComponent(
  () => import('@/components/trading/NewAccountDrawer.vue'),
);

const auth = useAuthStore();
const view = ref<AccountView>('active');
const page = ref(1);
watch(view, () => (page.value = 1));

const params = computed(() => ({
  status: ACCOUNT_VIEW_STATUS[view.value],
  page: page.value,
  page_size: 25,
}));
const list = useTradingAccounts(params);
const rows = computed(() => list.data.value?.rows ?? []);

const views: { key: AccountView; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'closed', label: 'Closed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

function platformLabel(a: TradingAccount): string {
  const p = a.platform;
  return p && 'name' in p ? p.name : `#${a.trading_platform_id}`;
}

const columns: ColumnDef<TradingAccount, any>[] = [
  {
    accessorKey: 'login',
    header: 'Login',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'font-mono font-medium text-fg', dir: 'ltr' },
        row.original.login ?? `#${row.original.id}`,
      ),
  },
  {
    accessorKey: 'client_id',
    header: 'Client',
    cell: ({ row }) => h('span', { class: 'text-muted' }, `#${row.original.client_id}`),
  },
  {
    accessorKey: 'trading_platform_id',
    header: 'Platform',
    cell: ({ row }) => h('span', { class: 'text-fg' }, platformLabel(row.original)),
  },
  {
    accessorKey: 'account_type',
    header: 'Type',
    cell: ({ row }) => h(AccountTypePill, { type: row.original.account_type }),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(StatusBadge, { status: row.original.status }),
  },
  {
    accessorKey: 'leverage',
    header: 'Leverage',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-fg' }, `1:${row.original.leverage ?? '—'}`),
  },
];

/* drawer-first row interaction */
const detailOpen = ref(false);
const activeAccount = ref<TradingAccount | null>(null);
function openDrawer(account: TradingAccount) {
  activeAccount.value = account;
  detailOpen.value = true;
}

const newOpen = ref(false);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <LineChart class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Trading Accounts</h1>
            <p class="text-sm text-muted">Account lifecycle across MT4/MT5 platforms.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Link href="/trading/requests">
            <Button variant="outline" size="sm"><Inbox class="size-4" /> Requests</Button>
          </Link>
          <Link href="/trading/workspace">
            <Button variant="outline" size="sm"><Columns3 class="size-4" /> Workspace</Button>
          </Link>
          <Button
            v-if="auth.can('trading.requests.create')"
            size="sm"
            @click="newOpen = true"
          >
            <Plus class="size-4" /> New account
          </Button>
        </div>
      </header>

      <AccountMetricsCards />

      <AccountDistribution />

      <!-- status views -->
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
        empty-title="No accounts"
        empty-description="No trading accounts match this view."
        @update:page="page = $event"
        @row-click="openDrawer"
        @retry="list.refetch()"
      />
    </div>

    <AccountDetailDrawer
      :open="detailOpen"
      :account="activeAccount"
      @update:open="detailOpen = $event"
      @changed="list.refetch()"
    />
    <NewAccountDrawer
      :open="newOpen"
      @update:open="newOpen = $event"
      @created="list.refetch()"
    />
  </AppLayout>
</template>
