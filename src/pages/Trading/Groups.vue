<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import { Link } from '@inertiajs/vue3';
import type { ColumnDef } from '@tanstack/vue-table';
import { Layers, Plus, Search, Trash2, Server } from '@lucide/vue';
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
  useTradingGroups,
  useTradingPlatforms,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
} from '@/queries/trading';
import type { TradingGroup } from '@/types/trading';

/* Trading group administration — platform groups (server-side risk
 * profiles). Drawer-first CRUD gated behind trading.groups.manage. */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const canManage = computed(() => auth.can('trading.groups.manage'));

const list = useTradingGroups(() => ({}));
const platforms = useTradingPlatforms(false);
const create = useCreateGroup();
const update = useUpdateGroup();
const remove = useDeleteGroup();

const search = ref('');
const platformFilter = ref<number | ''>('');
const page = ref(1);
const pageSize = 12;
watch([search, platformFilter], () => (page.value = 1));

const platformName = (id: number) =>
  platforms.data.value?.find((p) => p.id === id)?.name ?? `#${id}`;

const all = computed(() => list.data.value ?? []);
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return all.value.filter((g) => {
    if (platformFilter.value && g.trading_platform_id !== platformFilter.value) return false;
    if (!q) return true;
    return g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q);
  });
});
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const lastPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

const fields = computed<FieldDef[]>(() => [
  {
    key: 'trading_platform_id',
    label: 'Platform',
    type: 'select',
    required: true,
    options: (platforms.data.value ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
  },
  { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. real-usd' },
  { key: 'name', label: 'Name', type: 'text', required: true },
  {
    key: 'account_kind',
    label: 'Account kind',
    type: 'select',
    options: [
      { value: 'demo', label: 'Demo' },
      { value: 'live', label: 'Live' },
      { value: 'ib', label: 'IB' },
    ],
  },
  { key: 'default_leverage', label: 'Default leverage', type: 'number', min: 1, max: 5000, help: '1–5000 (optional).' },
  { key: 'is_active', label: 'Active', type: 'switch', default: true },
]);

const drawerOpen = ref(false);
const active = ref<TradingGroup | null>(null);
function openCreate() {
  active.value = null;
  drawerOpen.value = true;
}
function openEdit(g: TradingGroup) {
  active.value = g;
  drawerOpen.value = true;
}

function onSubmit(values: Record<string, unknown>) {
  const onSuccess = () => {
    toast.success(active.value ? 'Group updated' : 'Group created');
    drawerOpen.value = false;
  };
  const onError = (e: unknown) => toast.fromError(e);
  if (active.value) {
    update.mutate({ id: active.value.id, payload: values }, { onSuccess, onError });
  } else {
    create.mutate(values as Partial<TradingGroup>, { onSuccess, onError });
  }
}

async function onDelete(g: TradingGroup) {
  const ok = await confirm({
    title: `Delete group “${g.name}”?`,
    description: 'Accounts referencing it may be affected. This cannot be undone.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  remove.mutate(g.id, {
    onSuccess: () => toast.success('Group deleted'),
    onError: (e) => toast.fromError(e),
  });
}

const KIND_TONE: Record<string, 'info' | 'success' | 'accent'> = {
  demo: 'info',
  live: 'success',
  ib: 'accent',
};

const columns = computed<ColumnDef<TradingGroup, any>[]>(() => [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => h('span', { class: 'font-mono font-medium text-fg' }, row.original.code),
  },
  { accessorKey: 'name', header: 'Name', cell: ({ row }) => h('span', { class: 'text-fg' }, row.original.name) },
  {
    accessorKey: 'trading_platform_id',
    header: 'Platform',
    cell: ({ row }) => h('span', { class: 'text-muted' }, platformName(row.original.trading_platform_id)),
  },
  {
    accessorKey: 'account_kind',
    header: 'Kind',
    cell: ({ row }) =>
      row.original.account_kind
        ? h(Badge, { tone: KIND_TONE[row.original.account_kind] ?? 'neutral' }, () => row.original.account_kind)
        : h('span', { class: 'text-muted' }, '—'),
  },
  {
    accessorKey: 'default_leverage',
    header: 'Leverage',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-fg' }, row.original.default_leverage ? `1:${row.original.default_leverage}` : '—'),
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
          <Layers class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Trading Groups</h1>
            <p class="text-sm text-muted">Platform groups & default risk profiles.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Link href="/trading/platforms">
            <Button variant="outline" size="sm"><Server class="size-4" /> Platforms</Button>
          </Link>
          <Button v-if="canManage" size="sm" @click="openCreate"><Plus class="size-4" /> New group</Button>
        </div>
      </header>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative max-w-sm flex-1">
          <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            v-model="search"
            placeholder="Search groups…"
            class="w-full rounded-md border border-input bg-surface py-2 ps-8 pe-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          v-model="platformFilter"
          class="rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All platforms</option>
          <option v-for="p in platforms.data.value ?? []" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
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
        empty-title="No groups"
        empty-description="No trading groups match this filter."
        @update:page="page = $event"
        @row-click="openEdit"
        @retry="list.refetch()"
      />
    </div>

    <EntityFormDrawer
      :open="drawerOpen"
      :title="active ? `Edit group · ${active.code}` : 'New group'"
      :record="active"
      :fields="fields"
      :can-manage="canManage"
      :submitting="create.isPending.value || update.isPending.value"
      @update:open="drawerOpen = $event"
      @submit="onSubmit"
    />
  </AppLayout>
</template>
