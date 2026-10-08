<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { Database, Plus, Search, Trash2 } from '@lucide/vue';
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
  useCountries, useCreateCountry, useUpdateCountry, useDeleteCountry,
  useZones, useCreateZone, useUpdateZone, useDeleteZone,
  useCurrencies, useCreateCurrency, useUpdateCurrency, useDeleteCurrency,
  useLanguages, useCreateLanguage, useUpdateLanguage, useDeleteLanguage,
  useOptionModules, useOptions, useCreateOption, useUpdateOption, useDeleteOption,
} from '@/queries/reference';

/* Reference-data administration — countries, zones, currencies,
 * languages and option lists. Each tab is a drawer-first CRUD surface
 * over a plain-array endpoint (client-side search + pagination). Country/
 * zone/currency/language writes need reference.manage; option writes need
 * options.manage. */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const canRef = computed(() => auth.can('reference.manage'));
const canOpt = computed(() => auth.can('options.manage'));

const activeBadge = (on: boolean) =>
  h(Badge, { tone: on ? 'success' : 'neutral' }, () => (on ? 'Active' : 'Inactive'));

/* ----------------------------- data layer ----------------------------- */
const countries = useCountries();
const zones = useZones();
const currencies = useCurrencies();
const languages = useLanguages();
const optionModules = useOptionModules();

const moduleFilter = ref<number | ''>('');
const optionParams = computed(() => ({ option_module_id: moduleFilter.value || undefined }));
const options = useOptions(optionParams);

const M = {
  country: { c: useCreateCountry(), u: useUpdateCountry(), d: useDeleteCountry() },
  zone: { c: useCreateZone(), u: useUpdateZone(), d: useDeleteZone() },
  currency: { c: useCreateCurrency(), u: useUpdateCurrency(), d: useDeleteCurrency() },
  language: { c: useCreateLanguage(), u: useUpdateLanguage(), d: useDeleteLanguage() },
  option: { c: useCreateOption(), u: useUpdateOption(), d: useDeleteOption() },
};

const countryName = (id: number) =>
  countries.data.value?.find((c) => c.id === id)?.name ?? `#${id}`;
const moduleName = (id: number) =>
  optionModules.data.value?.find((m) => m.id === id)?.name_en ?? `#${id}`;

/* ------------------------------- tabs --------------------------------- */
type TabKey = 'countries' | 'zones' | 'currencies' | 'languages' | 'options';

interface TabConfig {
  key: TabKey;
  label: string;
  singular: string;
  canManage: boolean;
  mut: { c: any; u: any; d: any };
  query: any;
  rows: () => any[];
  fields: () => FieldDef[];
  columns: () => ColumnDef<any, any>[];
  matches: (row: any, q: string) => boolean;
  labelOf: (row: any) => string;
}

const tabs = computed<TabConfig[]>(() => [
  {
    key: 'countries',
    label: 'Countries',
    singular: 'country',
    canManage: canRef.value,
    mut: M.country,
    query: countries,
    rows: () => countries.data.value ?? [],
    fields: () => [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'iso2', label: 'ISO-2', type: 'text', required: true, placeholder: 'US' },
      { key: 'iso3', label: 'ISO-3', type: 'text', placeholder: 'USA' },
      { key: 'phone_code', label: 'Phone code', type: 'text', placeholder: '+1' },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
    ],
    columns: () => [
      { accessorKey: 'name', header: 'Name', cell: ({ row }) => h('span', { class: 'font-medium text-fg' }, row.original.name) },
      { accessorKey: 'iso2', header: 'ISO-2', cell: ({ row }) => h('span', { class: 'font-mono text-muted' }, row.original.iso2) },
      { accessorKey: 'phone_code', header: 'Phone', cell: ({ row }) => h('span', { class: 'text-muted' }, row.original.phone_code ?? '—') },
      { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => activeBadge(row.original.is_active) },
    ],
    matches: (r, q) => r.name.toLowerCase().includes(q) || r.iso2.toLowerCase().includes(q),
    labelOf: (r) => r.name,
  },
  {
    key: 'zones',
    label: 'Zones',
    singular: 'zone',
    canManage: canRef.value,
    mut: M.zone,
    query: zones,
    rows: () => zones.data.value ?? [],
    fields: () => [
      {
        key: 'country_id', label: 'Country', type: 'select', required: true,
        options: (countries.data.value ?? []).map((c) => ({ value: c.id, label: c.name })),
      },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
    ],
    columns: () => [
      { accessorKey: 'name', header: 'Name', cell: ({ row }) => h('span', { class: 'font-medium text-fg' }, row.original.name) },
      { accessorKey: 'country_id', header: 'Country', cell: ({ row }) => h('span', { class: 'text-muted' }, countryName(row.original.country_id)) },
      { accessorKey: 'code', header: 'Code', cell: ({ row }) => h('span', { class: 'font-mono text-muted' }, row.original.code ?? '—') },
      { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => activeBadge(row.original.is_active) },
    ],
    matches: (r, q) => r.name.toLowerCase().includes(q) || (r.code ?? '').toLowerCase().includes(q),
    labelOf: (r) => r.name,
  },
  {
    key: 'currencies',
    label: 'Currencies',
    singular: 'currency',
    canManage: canRef.value,
    mut: M.currency,
    query: currencies,
    rows: () => currencies.data.value ?? [],
    fields: () => [
      { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'USD' },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'symbol', label: 'Symbol', type: 'text', placeholder: '$' },
      { key: 'decimal_places', label: 'Decimal places', type: 'number', min: 0, max: 8, default: 2 },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
    ],
    columns: () => [
      { accessorKey: 'code', header: 'Code', cell: ({ row }) => h('span', { class: 'font-mono font-medium text-fg' }, row.original.code) },
      { accessorKey: 'name', header: 'Name', cell: ({ row }) => h('span', { class: 'text-fg' }, row.original.name) },
      { accessorKey: 'symbol', header: 'Symbol', cell: ({ row }) => h('span', { class: 'text-muted' }, row.original.symbol ?? '—') },
      { accessorKey: 'decimal_places', header: 'Decimals', cell: ({ row }) => h('span', { class: 'tabular-nums text-muted' }, String(row.original.decimal_places)) },
      { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => activeBadge(row.original.is_active) },
    ],
    matches: (r, q) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    labelOf: (r) => r.code,
  },
  {
    key: 'languages',
    label: 'Languages',
    singular: 'language',
    canManage: canRef.value,
    mut: M.language,
    query: languages,
    rows: () => languages.data.value ?? [],
    fields: () => [
      { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'en' },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'native_name', label: 'Native name', type: 'text' },
      { key: 'sort_order', label: 'Sort order', type: 'number', min: 0, default: 0 },
      { key: 'is_rtl', label: 'Right-to-left', type: 'switch' },
      { key: 'is_default', label: 'Default', type: 'switch' },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
    ],
    columns: () => [
      { accessorKey: 'name', header: 'Name', cell: ({ row }) => h('span', { class: 'font-medium text-fg' }, row.original.name) },
      { accessorKey: 'code', header: 'Code', cell: ({ row }) => h('span', { class: 'font-mono text-muted' }, row.original.code) },
      {
        id: 'flags', header: 'Flags',
        cell: ({ row }) => h('div', { class: 'flex gap-1' }, [
          row.original.is_default ? h(Badge, { tone: 'accent' }, () => 'Default') : null,
          row.original.is_rtl ? h(Badge, { tone: 'neutral' }, () => 'RTL') : null,
        ]),
      },
      { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => activeBadge(row.original.is_active) },
    ],
    matches: (r, q) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    labelOf: (r) => r.name,
  },
  {
    key: 'options',
    label: 'Option Lists',
    singular: 'option',
    canManage: canOpt.value,
    mut: M.option,
    query: options,
    rows: () => options.data.value ?? [],
    fields: () => [
      {
        key: 'option_module_id', label: 'Module', type: 'select', required: true,
        options: (optionModules.data.value ?? []).map((m) => ({ value: m.id, label: `${m.name_en} (${m.key})` })),
      },
      { key: 'key', label: 'Key', type: 'text', required: true },
      { key: 'name_en', label: 'Name (EN)', type: 'text', required: true },
      { key: 'name_cn', label: 'Name (CN)', type: 'text' },
      { key: 'sort_order', label: 'Sort order', type: 'number', min: 0, default: 0 },
      { key: 'is_default', label: 'Default', type: 'switch' },
      { key: 'is_active', label: 'Active', type: 'switch', default: true },
    ],
    columns: () => [
      { accessorKey: 'name_en', header: 'Name', cell: ({ row }) => h('span', { class: 'font-medium text-fg' }, row.original.name_en) },
      { accessorKey: 'key', header: 'Key', cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.key) },
      { accessorKey: 'option_module_id', header: 'Module', cell: ({ row }) => h('span', { class: 'text-muted' }, moduleName(row.original.option_module_id)) },
      { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => activeBadge(row.original.is_active) },
    ],
    matches: (r, q) => r.name_en.toLowerCase().includes(q) || r.key.toLowerCase().includes(q),
    labelOf: (r) => r.name_en,
  },
]);

const tab = ref<TabKey>('countries');
const current = computed(() => tabs.value.find((t) => t.key === tab.value)!);

const search = ref('');
const page = ref(1);
const pageSize = 12;
watch([tab, search, moduleFilter], () => (page.value = 1));

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const rows = current.value.rows();
  return q ? rows.filter((r) => current.value.matches(r, q)) : rows;
});
const rows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const lastPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

const columnsWithActions = computed<ColumnDef<any, any>[]>(() => [
  ...current.value.columns(),
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      current.value.canManage
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

/* ------------------------------ drawer -------------------------------- */
const drawerOpen = ref(false);
const active = ref<any | null>(null);
function openCreate() {
  active.value = null;
  drawerOpen.value = true;
}
function openEdit(r: any) {
  active.value = r;
  drawerOpen.value = true;
}

function onSubmit(values: Record<string, unknown>) {
  const c = current.value;
  const onSuccess = () => {
    toast.success(active.value ? `${c.singular} updated` : `${c.singular} created`);
    drawerOpen.value = false;
  };
  const onError = (e: unknown) => toast.fromError(e);
  if (active.value) {
    c.mut.u.mutate({ id: active.value.id, payload: values }, { onSuccess, onError });
  } else {
    c.mut.c.mutate(values, { onSuccess, onError });
  }
}

async function onDelete(r: any) {
  const c = current.value;
  const ok = await confirm({
    title: `Delete ${c.singular} “${c.labelOf(r)}”?`,
    description: 'Records referencing it may be affected. This cannot be undone.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  c.mut.d.mutate(r.id, {
    onSuccess: () => toast.success(`${c.singular} deleted`),
    onError: (e: unknown) => toast.fromError(e),
  });
}

const submitting = computed(
  () => current.value.mut.c.isPending.value || current.value.mut.u.isPending.value,
);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <Database class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Reference Data</h1>
            <p class="text-sm text-muted">Countries, zones, currencies, languages & option lists.</p>
          </div>
        </div>
        <Button v-if="current.canManage" size="sm" @click="openCreate">
          <Plus class="size-4" /> New {{ current.singular }}
        </Button>
      </header>

      <!-- tabs -->
      <div class="flex gap-1 overflow-x-auto border-b border-border">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="
            cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors -mb-px',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg',
            )
          "
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative max-w-sm flex-1">
          <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            v-model="search"
            :placeholder="`Search ${current.label.toLowerCase()}…`"
            class="w-full rounded-md border border-input bg-surface py-2 ps-8 pe-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          v-if="tab === 'options'"
          v-model="moduleFilter"
          class="rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All modules</option>
          <option v-for="m in optionModules.data.value ?? []" :key="m.id" :value="m.id">{{ m.name_en }}</option>
        </select>
      </div>

      <DataTable
        :data="rows"
        :columns="columnsWithActions"
        :loading="current.query.isLoading.value"
        :error="current.query.isError.value"
        :page="page"
        :page-size="pageSize"
        :total="filtered.length"
        :last-page="lastPage"
        :row-key="(r) => r.id"
        :empty-title="`No ${current.label.toLowerCase()}`"
        :empty-description="`No ${current.label.toLowerCase()} match this filter.`"
        @update:page="page = $event"
        @row-click="openEdit"
        @retry="current.query.refetch()"
      />
    </div>

    <EntityFormDrawer
      :open="drawerOpen"
      :title="active ? `Edit ${current.singular}` : `New ${current.singular}`"
      :record="active"
      :fields="current.fields()"
      :can-manage="current.canManage"
      :submitting="submitting"
      @update:open="drawerOpen = $event"
      @submit="onSubmit"
    />
  </AppLayout>
</template>
