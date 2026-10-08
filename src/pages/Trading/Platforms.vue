<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import { Link } from '@inertiajs/vue3';
import type { ColumnDef } from '@tanstack/vue-table';
import { Server, Plus, Search, Trash2, LineChart } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DataTable from '@/components/data/DataTable.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import EntityFormDrawer, { type FieldDef } from '@/components/admin/EntityFormDrawer.vue';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import {
  useTradingPlatforms,
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
} from '@/queries/trading';
import type { TradingPlatform } from '@/types/trading';

/* Trading platform administration — MT4/MT5 platform registry. Drawer-
 * first CRUD gated behind trading.platforms.manage. */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const canManage = computed(() => auth.can('trading.platforms.manage'));

const list = useTradingPlatforms(false);
const create = useCreatePlatform();
const update = useUpdatePlatform();
const remove = useDeletePlatform();

const search = ref('');
const page = ref(1);
const pageSize = 12;
watch(search, () => (page.value = 1));

const all = computed(() => list.data.value ?? []);
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return all.value;
  return all.value.filter(
    (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
  );
});
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const lastPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

const fields: FieldDef[] = [
  { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. MT5', help: 'Unique platform code (max 50).' },
  { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. MetaTrader 5' },
  { key: 'is_active', label: 'Active', type: 'switch', default: true },
];

const drawerOpen = ref(false);
const active = ref<TradingPlatform | null>(null);
function openCreate() {
  active.value = null;
  drawerOpen.value = true;
}
function openEdit(p: TradingPlatform) {
  active.value = p;
  drawerOpen.value = true;
}

function onSubmit(values: Record<string, unknown>) {
  const onSuccess = () => {
    toast.success(active.value ? 'Platform updated' : 'Platform created');
    drawerOpen.value = false;
  };
  const onError = (e: unknown) => toast.fromError(e);
  if (active.value) {
    update.mutate({ id: active.value.id, payload: values }, { onSuccess, onError });
  } else {
    create.mutate(values as Partial<TradingPlatform>, { onSuccess, onError });
  }
}

async function onDelete(p: TradingPlatform) {
  const ok = await confirm({
    title: `Delete platform “${p.name}”?`,
    description: 'Groups and accounts referencing it may be affected. This cannot be undone.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  remove.mutate(p.id, {
    onSuccess: () => toast.success('Platform deleted'),
    onError: (e) => toast.fromError(e),
  });
}

const columns = computed<ColumnDef<TradingPlatform, any>[]>(() => [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => h('span', { class: 'font-mono font-medium text-fg' }, row.original.code),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('span', { class: 'text-fg' }, row.original.name),
  },
  {
    id: 'groups',
    header: 'Groups',
    cell: ({ row }) => h('span', { class: 'text-muted' }, `${row.original.groups?.length ?? 0}`),
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) =>
      h(Badge, { tone: row.original.is_active ? 'success' : 'neutral' }, () =>
        row.original.is_active ? 'Active' : 'Inactive',
      ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      canManage.value
        ? h(
            'button',
            {
              class: 'rounded-md p-1.5 text-muted transition-colors hover:bg-status-danger/10 hover:text-status-danger',
              title: 'Delete',
              onClick: (e: MouseEvent) => {
                e.stopPropagation();
                onDelete(row.original);
              },
            },
            h(Trash2, { class: 'size-4' }),
          )
        : null,
  },
]);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <Server class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Trading Platforms</h1>
            <p class="text-sm text-muted">MT4 / MT5 platform registry.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Link href="/trading/groups">
            <Button variant="outline" size="sm"><LineChart class="size-4" /> Groups</Button>
          </Link>
          <Button v-if="canManage" size="sm" @click="openCreate"><Plus class="size-4" /> New platform</Button>
        </div>
      </header>

      <div class="relative max-w-sm">
        <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          v-model="search"
          placeholder="Search platforms…"
          :class="cn('w-full rounded-md border border-input bg-surface py-2 ps-8 pe-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')"
        />
      </div>

      <DataTable
        :data="rows"
        :columns="columns"
        :loading="list.isLoading.value"
        :error="list.isError.value"
        :page="page"
        :page-size="pageSize"
        :total="filtered.length"
        :last-page="lastPage"
        :row-key="(r) => r.id"
        empty-title="No platforms"
        empty-description="Create your first trading platform."
        @update:page="page = $event"
        @row-click="openEdit"
        @retry="list.refetch()"
      />
    </div>

    <EntityFormDrawer
      :open="drawerOpen"
      :title="active ? `Edit platform · ${active.code}` : 'New platform'"
      :record="active"
      :fields="fields"
      :can-manage="canManage"
      :submitting="create.isPending.value || update.isPending.value"
      @update:open="drawerOpen = $event"
      @submit="onSubmit"
    />
  </AppLayout>
</template>
