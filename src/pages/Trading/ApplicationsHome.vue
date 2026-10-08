<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { refDebounced } from '@vueuse/core';
import { ClipboardList, Plus, FileWarning, Search } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AccountTypePill from '@/components/trading/AccountTypePill.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import { timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useApplicationsList } from '@/queries/applications';
import type { ApplicationRecord } from '@/types/applications';

/* Applications — the canonical list of Demo/Live applications. The menu opens
 * this list; Demo/Live creation reuses the existing website-reproduction forms.
 * Every row is a real TradingAccountRequest record loaded from the API. */
defineOptions({ layout: null });

const auth = useAuthStore();
const router = useRouter();
const canDemo = computed(() => auth.can('trading.applications.demo.create'));
const canLive = computed(() => auth.can('trading.applications.live.create'));

const search = ref('');
const debounced = refDebounced(search, 300);
const type = ref<'' | 'demo' | 'live'>('');
const status = ref<'' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('');
const page = ref(1);

const params = computed(() => ({
  search: debounced.value || undefined,
  type: type.value || undefined,
  status: status.value || undefined,
  page: page.value,
  page_size: 25,
}));

watch([debounced, type, status], () => (page.value = 1));

const list = useApplicationsList(params);
const rows = computed(() => list.data.value?.rows ?? []);
const lastPage = computed(() => list.data.value?.last_page ?? 1);

function open(app: ApplicationRecord) {
  router.push({ name: 'trading.applications.show', params: { reference: app.reference } });
}

function applicantLabel(app: ApplicationRecord) {
  return (
    app.client?.name ||
    app.lead?.name ||
    app.client?.client_code ||
    (app.lead_id ? `Lead #${app.lead_id}` : `Client #${app.client_id}`)
  );
}

function applicantSub(app: ApplicationRecord) {
  if (app.client) return app.client.client_code ?? '—';
  if (app.lead) return `Lead · ${app.lead.email ?? app.lead.mobile ?? '—'}`;
  return '—';
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;
const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'demo', label: 'Demo' },
  { value: 'live', label: 'Live' },
] as const;
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-[100rem] space-y-4 p-4 sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <ClipboardList class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Applications</h1>
            <p class="text-sm text-muted">
              Demo and live applications submitted through the website-reproduction forms.
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button v-if="canDemo" variant="outline" @click="router.push({ name: 'trading.applications.demo' })">
            <Plus /> Create Demo Application
          </Button>
          <Button v-if="canLive" @click="router.push({ name: 'trading.applications.live' })">
            <Plus /> Create Live Application
          </Button>
        </div>
      </header>

      <!-- filters -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-56 flex-1">
          <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input v-model="search" class="ps-8" placeholder="Search applicant, code or email…" aria-label="Search applications" />
        </div>
        <select
          v-model="type"
          class="h-9 rounded-md border border-input bg-surface px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filter by type"
        >
          <option v-for="o in TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select
          v-model="status"
          class="h-9 rounded-md border border-input bg-surface px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filter by status"
        >
          <option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <SkeletonList v-if="list.isLoading.value && !rows.length" :rows="6" />

      <div v-else-if="list.isError.value" class="rounded-lg border border-status-danger/40 bg-status-danger/5 p-4 text-sm text-fg">
        Could not load applications. Please retry.
      </div>

      <EmptyState
        v-else-if="!rows.length"
        :icon="ClipboardList"
        title="No applications"
        description="No applications match the current filters."
      />

      <div v-else class="overflow-hidden rounded-lg border border-border bg-surface">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-muted-surface/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th class="px-3 py-2 text-start font-semibold">Reference</th>
                <th class="px-3 py-2 text-start font-semibold">Applicant</th>
                <th class="px-3 py-2 text-start font-semibold">Type</th>
                <th class="px-3 py-2 text-start font-semibold">Status</th>
                <th class="px-3 py-2 text-start font-semibold">KYC</th>
                <th class="px-3 py-2 text-start font-semibold">Platform</th>
                <th class="px-3 py-2 text-start font-semibold">Created</th>
                <th class="px-3 py-2 text-start font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="app in rows"
                :key="app.id"
                class="cursor-pointer border-t border-border transition-colors hover:bg-muted-surface/50"
                tabindex="0"
                @click="open(app)"
                @keydown.enter="open(app)"
              >
                <td class="px-3 py-2 font-mono text-xs text-fg">{{ app.reference }}</td>
                <td class="px-3 py-2">
                  <div class="font-medium text-fg">{{ applicantLabel(app) }}</div>
                  <div class="text-xs text-muted">{{ applicantSub(app) }}</div>
                </td>
                <td class="px-3 py-2"><AccountTypePill :type="app.account_type" /></td>
                <td class="px-3 py-2"><StatusBadge :status="app.status" /></td>
                <td class="px-3 py-2">
                  <StatusBadge
                    :status="app.kyc_approved ? 'approved' : (app.kyc_status ?? 'not_started')"
                    :label="app.kyc_approved ? 'Approved' : undefined"
                  />
                </td>
                <td class="px-3 py-2 text-fg">{{ app.platform?.name ?? '—' }}</td>
                <td class="px-3 py-2 text-muted">{{ app.created_at ? timeAgo(app.created_at) : '—' }}</td>
                <td class="px-3 py-2 text-muted">{{ app.updated_at ? timeAgo(app.updated_at) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="lastPage > 1" class="flex items-center justify-between border-t border-border px-3 py-2 text-sm text-muted">
          <span>Page {{ page }} of {{ lastPage }}</span>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" :disabled="page <= 1" @click="page -= 1">Previous</Button>
            <Button variant="outline" size="sm" :disabled="page >= lastPage" @click="page += 1">Next</Button>
          </div>
        </div>
      </div>

      <p class="text-xs text-muted">
        <FileWarning class="me-1 inline size-3.5" />
        Application approval requires approved KYC — for Demo, Live and IB alike.
      </p>
    </div>
  </AppLayout>
</template>
