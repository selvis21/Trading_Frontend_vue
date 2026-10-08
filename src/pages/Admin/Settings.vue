<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { Settings2, Plus, Search } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DataTable from '@/components/data/DataTable.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import SettingEditDrawer from '@/components/admin/SettingEditDrawer.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useSettings, useUpdateSetting } from '@/queries/reference';
import type { Setting, SettingType } from '@/types/admin';

/* Global settings / system configuration. Reading requires settings.view;
 * upserting requires settings.manage. Values are typed and edited in a
 * drawer; the backend supports create-by-key + update (no delete). */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const canManage = computed(() => auth.can('settings.manage'));

const list = useSettings();
const save = useUpdateSetting();

const search = ref('');
const groupFilter = ref('');
const page = ref(1);
const pageSize = 15;
watch([search, groupFilter], () => (page.value = 1));

const all = computed(() => list.data.value ?? []);
const groups = computed(() => [...new Set(all.value.map((s) => s.group))].sort());
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return all.value.filter((s) => {
    if (groupFilter.value && s.group !== groupFilter.value) return false;
    if (!q) return true;
    return s.key.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q);
  });
});
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const lastPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

const drawerOpen = ref(false);
const mode = ref<'edit' | 'create'>('edit');
const active = ref<Setting | null>(null);

function openCreate() {
  mode.value = 'create';
  active.value = null;
  drawerOpen.value = true;
}
function openEdit(s: Setting) {
  mode.value = 'edit';
  active.value = s;
  drawerOpen.value = true;
}

function onSubmit(values: {
  key: string;
  value: unknown;
  type: SettingType;
  description: string | null;
  is_public: boolean;
  group?: string;
}) {
  const { key, ...payload } = values;
  save.mutate(
    { key, payload },
    {
      onSuccess: () => {
        toast.success('Setting saved');
        drawerOpen.value = false;
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

function preview(s: Setting): string {
  if (s.type === 'json') {
    try {
      return JSON.stringify(s.value);
    } catch {
      return '—';
    }
  }
  if (s.value === null || s.value === undefined) return '—';
  return String(s.value);
}

const columns = computed<ColumnDef<Setting, any>[]>(() => [
  {
    accessorKey: 'key',
    header: 'Key',
    cell: ({ row }) =>
      h('div', {}, [
        h('p', { class: 'font-mono text-sm font-medium text-fg' }, row.original.key),
        row.original.description ? h('p', { class: 'text-xs text-muted' }, row.original.description) : null,
      ]),
  },
  {
    accessorKey: 'group',
    header: 'Group',
    cell: ({ row }) => h(Badge, { tone: 'neutral' }, () => row.original.group),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.type),
  },
  {
    id: 'value',
    header: 'Value',
    cell: ({ row }) =>
      h('span', { class: 'block max-w-[20rem] truncate font-mono text-xs text-fg', dir: 'ltr' }, preview(row.original)),
  },
  {
    accessorKey: 'is_public',
    header: 'Public',
    cell: ({ row }) =>
      row.original.is_public ? h(Badge, { tone: 'info' }, () => 'Public') : h('span', { class: 'text-muted' }, '—'),
  },
]);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <Settings2 class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Settings</h1>
            <p class="text-sm text-muted">System configuration parameters.</p>
          </div>
        </div>
        <Button v-if="canManage" size="sm" @click="openCreate"><Plus class="size-4" /> New setting</Button>
      </header>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative max-w-sm flex-1">
          <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            v-model="search"
            placeholder="Search keys…"
            class="w-full rounded-md border border-input bg-surface py-2 ps-8 pe-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          v-model="groupFilter"
          class="rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All groups</option>
          <option v-for="g in groups" :key="g" :value="g">{{ g }}</option>
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
        :row-key="(r) => r.key"
        empty-title="No settings"
        empty-description="No configuration parameters match this filter."
        @update:page="page = $event"
        @row-click="openEdit"
        @retry="list.refetch()"
      />
    </div>

    <SettingEditDrawer
      :open="drawerOpen"
      :setting="active"
      :mode="mode"
      :can-manage="canManage"
      :submitting="save.isPending.value"
      @update:open="drawerOpen = $event"
      @submit="onSubmit"
    />
  </AppLayout>
</template>
