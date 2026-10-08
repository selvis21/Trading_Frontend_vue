<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import { router } from '@inertiajs/vue3';
import type { ColumnDef } from '@tanstack/vue-table';
import { ShieldCheck } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DataTable from '@/components/data/DataTable.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Badge from '@/components/ui/Badge.vue';
import MetricsCards from '@/components/compliance/MetricsCards.vue';
import RiskBadge from '@/components/compliance/RiskBadge.vue';
import { cn } from '@/lib/utils';
import { useKycProfiles } from '@/queries/compliance';
import type { KycProfile, KycProfileStatus } from '@/types/compliance';

defineOptions({ layout: null });

const statusFilter = ref<KycProfileStatus | ''>('');
const page = ref(1);
watch(statusFilter, () => (page.value = 1));

const params = computed(() => ({
  status: statusFilter.value || undefined,
  page: page.value,
  page_size: 25,
}));
const list = useKycProfiles(params);
const rows = computed(() => list.data.value?.rows ?? []);

const filters: { value: KycProfileStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'not_started', label: 'Not started' },
];

const columns: ColumnDef<KycProfile, any>[] = [
  {
    accessorKey: 'client_id',
    header: 'Client',
    cell: ({ row }) => h('span', { class: 'font-medium text-fg' }, `Client #${row.original.client_id}`),
  },
  {
    accessorKey: 'status',
    header: 'KYC status',
    cell: ({ row }) => h(StatusBadge, { status: row.original.status }),
  },
  {
    accessorKey: 'risk_level',
    header: 'Risk',
    cell: ({ row }) => h(RiskBadge, { risk: row.original.risk_level }),
  },
  {
    accessorKey: 'identity_verified',
    header: 'Identity',
    cell: ({ row }) =>
      h(Badge, { tone: row.original.identity_verified ? 'success' : 'neutral' }, () =>
        row.original.identity_verified ? 'Verified' : 'Pending',
      ),
  },
  {
    accessorKey: 'address_verified',
    header: 'Address',
    cell: ({ row }) =>
      h(Badge, { tone: row.original.address_verified ? 'success' : 'neutral' }, () =>
        row.original.address_verified ? 'Verified' : 'Pending',
      ),
  },
];
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header class="flex items-center gap-2.5">
        <ShieldCheck class="size-5 text-primary" />
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-fg">KYC Profiles</h1>
          <p class="text-sm text-muted">All client verification profiles.</p>
        </div>
      </header>

      <MetricsCards />

      <div class="flex gap-1">
        <button
          v-for="f in filters"
          :key="f.value"
          :class="
            cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              statusFilter === f.value ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
            )
          "
          @click="statusFilter = f.value"
        >
          {{ f.label }}
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
        empty-title="No profiles"
        empty-description="No KYC profiles match this filter."
        @update:page="page = $event"
        @row-click="router.visit(`/compliance/profiles/${$event.client_id}`)"
        @retry="list.refetch()"
      />
    </div>
  </AppLayout>
</template>
