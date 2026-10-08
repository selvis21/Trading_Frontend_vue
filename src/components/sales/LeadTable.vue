<script setup lang="ts">
import { computed, h } from 'vue';
import type { ColumnDef, SortingState } from '@tanstack/vue-table';
import { Ban, CheckCircle2, Waves } from '@lucide/vue';
import DataTable from '@/components/data/DataTable.vue';
import Avatar from '@/components/ui/Avatar.vue';
import Badge from '@/components/ui/Badge.vue';
import LeadStatusPill from './LeadStatusPill.vue';
import { timeAgo } from '@/lib/utils';
import { useLeadStatuses } from '@/queries/salesReference';
import type { Lead } from '@/types/sales';

/* The lead list table: server-paginated, selectable (bulk), virtualized
 * for large pages. Columns render identity, status, owner and signals. */
const props = defineProps<{
  rows: Lead[];
  loading?: boolean;
  error?: boolean;
  page: number;
  pageSize: number;
  total: number;
  lastPage: number;
  sort?: SortingState;
  selected: number[];
}>();
const emit = defineEmits<{
  'update:page': [v: number];
  'update:pageSize': [v: number];
  'update:sort': [v: SortingState];
  'update:selected': [v: (string | number)[]];
  open: [lead: Lead];
}>();

const statuses = useLeadStatuses();

const columns = computed<ColumnDef<Lead, any>[]>(() => [
  {
    accessorKey: 'name',
    header: 'Lead',
    cell: ({ row }) => {
      const l = row.original;
      return h('div', { class: 'flex items-center gap-2.5' }, [
        h(Avatar, { name: l.name, size: 'sm' }),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'flex items-center gap-1.5 font-medium text-fg' }, [
            l.name,
            l.is_blacklisted
              ? h(Ban, { class: 'size-3.5 text-status-danger' })
              : null,
            l.is_converted
              ? h(CheckCircle2, { class: 'size-3.5 text-status-success' })
              : null,
          ]),
          h(
            'div',
            { class: 'truncate text-xs text-muted' },
            l.email || l.mobile || '—',
          ),
        ]),
      ]);
    },
  },
  {
    accessorKey: 'status_id',
    header: 'Status',
    cell: ({ row }) =>
      h(LeadStatusPill, {
        statusId: row.original.status_id,
        statuses: statuses.byId.value,
        fallback: row.original.status?.name,
      }),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) =>
      h(
        Badge,
        { tone: row.original.type === 'ib' ? 'accent' : 'neutral' },
        () => (row.original.type ?? '—').toUpperCase(),
      ),
  },
  {
    accessorKey: 'owner',
    header: 'Owner',
    cell: ({ row }) => {
      const o = row.original.owner;
      return o
        ? h('div', { class: 'flex items-center gap-1.5' }, [
            h(Avatar, { name: o.name, size: 'xs' }),
            h('span', { class: 'truncate text-sm' }, o.name),
          ])
        : row.original.is_abandoned
          ? h('span', { class: 'inline-flex items-center gap-1 text-xs text-status-warning' }, [
              h(Waves, { class: 'size-3.5' }),
              'Public sea',
            ])
          : h('span', { class: 'text-xs text-muted' }, 'Unassigned');
    },
  },
  {
    // Campaign/source attribution — the real stored campaign source (falls back
    // to the free-text campaign name or site source) for day-to-day triage.
    accessorKey: 'campaign_source',
    header: 'Source',
    cell: ({ row }) => {
      const l = row.original;
      const label = l.campaign_source?.name || l.campaign_name || l.site_source;
      return h(
        'span',
        { class: 'text-sm text-muted', title: label ?? '' },
        label ?? '—',
      );
    },
  },
  {
    accessorKey: 'last_tracked_at',
    header: 'Last touch',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-sm text-muted', title: row.original.last_tracked_at ?? '' },
        row.original.last_tracked_at
          ? timeAgo(row.original.last_tracked_at)
          : '—',
      ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-sm text-muted', title: row.original.created_at ?? '' },
        row.original.created_at ? timeAgo(row.original.created_at) : '—',
      ),
  },
]);
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :loading="loading"
    :error="error"
    :page="page"
    :page-size="pageSize"
    :total="total"
    :last-page="lastPage"
    :sort="sort"
    :selected="selected"
    selectable
    virtualize
    max-height="calc(100dvh - 20rem)"
    :estimate-row-height="56"
    :row-key="(r) => r.id"
    empty-title="No leads found"
    empty-description="Adjust your filters or create a new lead."
    @update:page="emit('update:page', $event)"
    @update:page-size="emit('update:pageSize', $event)"
    @update:sort="emit('update:sort', $event)"
    @update:selected="emit('update:selected', $event)"
    @row-click="emit('open', $event)"
  />
</template>
