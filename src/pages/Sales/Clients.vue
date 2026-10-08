<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import { refDebounced } from '@vueuse/core';
import { router } from '@inertiajs/vue3';
import { UserSquare, Search } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DataTable from '@/components/data/DataTable.vue';
import Input from '@/components/ui/Input.vue';
import Avatar from '@/components/ui/Avatar.vue';
import Badge from '@/components/ui/Badge.vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { timeAgo } from '@/lib/utils';
import { useClientsList } from '@/queries/clients';
import type { Client } from '@/types/sales';

defineOptions({ layout: null });

/* Client directory — the real client records (GET /clients), which includes
 * both clients converted from leads and contact-only clients registered
 * through the client-first account workflow or website applications. Server-
 * side search on name / email / mobile / client code. Rows open the client
 * profile by CLIENT id. */
const search = ref('');
const debounced = refDebounced(search, 300);
const page = ref(1);
watch(debounced, () => (page.value = 1));

const params = computed(() => ({
  search: debounced.value.trim() || undefined,
  page: page.value,
  page_size: 25,
}));
const list = useClientsList(params);
const rows = computed(() => list.data.value?.rows ?? []);

const columns: ColumnDef<Client, any>[] = [
  {
    accessorKey: 'name',
    header: 'Client',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2.5' }, [
        h(Avatar, { name: row.original.display_name || row.original.name || 'Client', size: 'sm' }),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'font-medium text-fg' }, row.original.display_name || row.original.name || '—'),
          h('div', { class: 'truncate text-xs text-muted' }, row.original.email || row.original.mobile || '—'),
        ]),
      ]),
  },
  {
    accessorKey: 'client_code',
    header: 'Client code',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-fg' }, row.original.client_code ?? '—'),
  },
  {
    accessorKey: 'is_contact_only',
    header: 'Type',
    cell: ({ row }) =>
      h(Badge, { tone: row.original.is_contact_only ? 'info' : 'neutral' }, () =>
        row.original.is_contact_only ? 'Contact only' : 'Lead',
      ),
  },
  {
    accessorKey: 'kyc_verified',
    header: 'KYC',
    cell: ({ row }) =>
      h(Badge, { tone: row.original.kyc_verified ? 'success' : 'neutral' }, () =>
        row.original.kyc_verified ? 'Verified' : 'Not verified',
      ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) =>
      h(Badge, { tone: row.original.status === 'inactive' ? 'neutral' : 'success' }, () =>
        (row.original.status ?? 'active').toUpperCase(),
      ),
  },
  {
    accessorKey: 'converted_at',
    header: 'Registered',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted' }, row.original.converted_at ? timeAgo(row.original.converted_at) : '—'),
  },
];
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <header class="flex items-center gap-2.5">
        <UserSquare class="size-5 text-primary" />
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-fg">Clients</h1>
          <p class="text-sm text-muted">Client directory — converted and contact-only clients.</p>
        </div>
      </header>

      <div class="relative max-w-sm">
        <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input v-model="search" placeholder="Search by name, email, mobile or client code…" class="ps-8" />
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
        empty-title="No clients yet"
        empty-description="Convert a qualified lead or register a client from the account workflow."
        @update:page="page = $event"
        @row-click="router.visit(`/clients/${$event.id}`)"
        @retry="list.refetch()"
      />
    </div>
  </AppLayout>
</template>
