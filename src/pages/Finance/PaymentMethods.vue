<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { CreditCard, Plus, Search, Trash2 } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DataTable from '@/components/data/DataTable.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import EntityFormDrawer, { type FieldDef } from '@/components/admin/EntityFormDrawer.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
} from '@/queries/finance';
import type { PaymentMethod } from '@/types/finance';

/* Payment-method administration — deposit/withdrawal rails. Drawer-first
 * CRUD gated behind finance.methods.manage. */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const canManage = computed(() => auth.can('finance.methods.manage'));

const list = usePaymentMethods(false);
const create = useCreatePaymentMethod();
const update = useUpdatePaymentMethod();
const remove = useDeletePaymentMethod();

const search = ref('');
const page = ref(1);
const pageSize = 12;
watch(search, () => (page.value = 1));

const all = computed(() => list.data.value ?? []);
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return all.value;
  return all.value.filter(
    (m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q),
  );
});
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const lastPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

const fields: FieldDef[] = [
  { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. bank-wire', help: 'Unique method code (max 100).' },
  { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Bank Wire' },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'manual', label: 'Manual' },
      { value: 'gateway', label: 'Gateway' },
    ],
  },
  { key: 'is_active', label: 'Active', type: 'switch', default: true },
];

const drawerOpen = ref(false);
const active = ref<PaymentMethod | null>(null);
function openCreate() {
  active.value = null;
  drawerOpen.value = true;
}
function openEdit(m: PaymentMethod) {
  active.value = m;
  drawerOpen.value = true;
}

function onSubmit(values: Record<string, unknown>) {
  const onSuccess = () => {
    toast.success(active.value ? 'Payment method updated' : 'Payment method created');
    drawerOpen.value = false;
  };
  const onError = (e: unknown) => toast.fromError(e);
  if (active.value) {
    update.mutate({ id: active.value.id, payload: values }, { onSuccess, onError });
  } else {
    create.mutate(values as Partial<PaymentMethod>, { onSuccess, onError });
  }
}

async function onDelete(m: PaymentMethod) {
  const ok = await confirm({
    title: `Delete “${m.name}”?`,
    description: 'This payment method will no longer be selectable. This cannot be undone.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  remove.mutate(m.id, {
    onSuccess: () => toast.success('Payment method deleted'),
    onError: (e) => toast.fromError(e),
  });
}

const columns = computed<ColumnDef<PaymentMethod, any>[]>(() => [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => h('span', { class: 'font-mono font-medium text-fg' }, row.original.code),
  },
  { accessorKey: 'name', header: 'Name', cell: ({ row }) => h('span', { class: 'text-fg' }, row.original.name) },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) =>
      row.original.type
        ? h(Badge, { tone: row.original.type === 'gateway' ? 'accent' : 'neutral' }, () => row.original.type)
        : h('span', { class: 'text-muted' }, '—'),
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
          <CreditCard class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Payment Methods</h1>
            <p class="text-sm text-muted">Deposit & withdrawal rails.</p>
          </div>
        </div>
        <Button v-if="canManage" size="sm" @click="openCreate"><Plus class="size-4" /> New method</Button>
      </header>

      <div class="relative max-w-sm">
        <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          v-model="search"
          placeholder="Search payment methods…"
          class="w-full rounded-md border border-input bg-surface py-2 ps-8 pe-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        empty-title="No payment methods"
        empty-description="Create your first payment method."
        @update:page="page = $event"
        @row-click="openEdit"
        @retry="list.refetch()"
      />
    </div>

    <EntityFormDrawer
      :open="drawerOpen"
      :title="active ? `Edit method · ${active.code}` : 'New payment method'"
      :record="active"
      :fields="fields"
      :can-manage="canManage"
      :submitting="create.isPending.value || update.isPending.value"
      @update:open="drawerOpen = $event"
      @submit="onSubmit"
    />
  </AppLayout>
</template>
