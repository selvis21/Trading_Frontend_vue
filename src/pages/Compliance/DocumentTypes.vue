<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import { Link } from '@inertiajs/vue3';
import type { ColumnDef } from '@tanstack/vue-table';
import { FileText, Plus, Search, Trash2, ShieldCheck } from '@lucide/vue';
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
  useManagedDocumentTypes,
  useCreateDocumentType,
  useUpdateDocumentType,
  useDeleteDocumentType,
} from '@/queries/compliance';
import type { DocumentCategory, KycDocumentType } from '@/types/compliance';

/* KYC document-type administration — the catalogue of acceptable
 * verification documents. Drawer-first CRUD gated behind
 * compliance.doctypes.manage. */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const canManage = computed(() => auth.can('compliance.doctypes.manage'));

const categoryFilter = ref<DocumentCategory | ''>('');
const params = computed(() => ({
  category: categoryFilter.value || undefined,
}));
const list = useManagedDocumentTypes(params);
const create = useCreateDocumentType();
const update = useUpdateDocumentType();
const remove = useDeleteDocumentType();

const search = ref('');
const page = ref(1);
const pageSize = 12;
watch([search, categoryFilter], () => (page.value = 1));

const all = computed(() => list.data.value ?? []);
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return all.value;
  return all.value.filter(
    (d) => d.name.toLowerCase().includes(q) || (d.code ?? '').toLowerCase().includes(q),
  );
});
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const lastPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

const categories: { value: DocumentCategory | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'identity', label: 'Identity' },
  { value: 'address', label: 'Address' },
  { value: 'other', label: 'Other' },
];

const fields = computed<FieldDef[]>(() => [
  { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Passport' },
  { key: 'name_cn', label: 'Name (CN)', type: 'text' },
  { key: 'code', label: 'Code', type: 'text', placeholder: 'e.g. passport (unique)' },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { value: 'identity', label: 'Identity' },
      { value: 'address', label: 'Address' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'parent_id',
    label: 'Parent type',
    type: 'select',
    options: (list.data.value ?? [])
      .filter((d) => d.id !== active.value?.id)
      .map((d) => ({ value: d.id, label: d.name })),
    help: 'Optional — for hierarchical grouping.',
  },
  { key: 'requires_id_number', label: 'Requires ID number', type: 'switch' },
  { key: 'requires_expiry', label: 'Requires expiry date', type: 'switch' },
  { key: 'sort_order', label: 'Sort order', type: 'number', min: 0, default: 0 },
  { key: 'is_active', label: 'Active', type: 'switch', default: true },
]);

const drawerOpen = ref(false);
const active = ref<KycDocumentType | null>(null);
function openCreate() {
  active.value = null;
  drawerOpen.value = true;
}
function openEdit(d: KycDocumentType) {
  active.value = d;
  drawerOpen.value = true;
}

function onSubmit(values: Record<string, unknown>) {
  const onSuccess = () => {
    toast.success(active.value ? 'Document type updated' : 'Document type created');
    drawerOpen.value = false;
  };
  const onError = (e: unknown) => toast.fromError(e);
  if (active.value) {
    update.mutate({ id: active.value.id, payload: values }, { onSuccess, onError });
  } else {
    create.mutate(values as Partial<KycDocumentType>, { onSuccess, onError });
  }
}

async function onDelete(d: KycDocumentType) {
  const ok = await confirm({
    title: `Delete “${d.name}”?`,
    description: 'This document type will no longer be requestable. This cannot be undone.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  remove.mutate(d.id, {
    onSuccess: () => toast.success('Document type deleted'),
    onError: (e) => toast.fromError(e),
  });
}

const CAT_TONE: Record<string, 'info' | 'accent' | 'neutral'> = {
  identity: 'info',
  address: 'accent',
  other: 'neutral',
};

const columns = computed<ColumnDef<KycDocumentType, any>[]>(() => [
  { accessorKey: 'name', header: 'Name', cell: ({ row }) => h('span', { class: 'font-medium text-fg' }, row.original.name) },
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.code ?? '—'),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) =>
      row.original.category
        ? h(Badge, { tone: CAT_TONE[row.original.category] ?? 'neutral' }, () => row.original.category)
        : h('span', { class: 'text-muted' }, '—'),
  },
  {
    id: 'requires',
    header: 'Requires',
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-muted' }, [
        row.original.requires_id_number ? 'ID# ' : '',
        row.original.requires_expiry ? 'Expiry' : '',
      ].join('').trim() || '—'),
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
          <FileText class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Document Types</h1>
            <p class="text-sm text-muted">KYC document catalogue.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Link href="/compliance/queue">
            <Button variant="outline" size="sm"><ShieldCheck class="size-4" /> KYC Queue</Button>
          </Link>
          <Button v-if="canManage" size="sm" @click="openCreate"><Plus class="size-4" /> New type</Button>
        </div>
      </header>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex gap-1">
          <button
            v-for="c in categories"
            :key="c.value"
            :class="
              cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                categoryFilter === c.value ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
              )
            "
            @click="categoryFilter = c.value"
          >
            {{ c.label }}
          </button>
        </div>
        <div class="relative max-w-xs flex-1">
          <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            v-model="search"
            placeholder="Search…"
            class="w-full rounded-md border border-input bg-surface py-2 ps-8 pe-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
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
        empty-title="No document types"
        empty-description="No document types match this filter."
        @update:page="page = $event"
        @row-click="openEdit"
        @retry="list.refetch()"
      />
    </div>

    <EntityFormDrawer
      :open="drawerOpen"
      :title="active ? `Edit type · ${active.name}` : 'New document type'"
      :record="active"
      :fields="fields"
      :can-manage="canManage"
      :submitting="create.isPending.value || update.isPending.value"
      @update:open="drawerOpen = $event"
      @submit="onSubmit"
    />
  </AppLayout>
</template>
