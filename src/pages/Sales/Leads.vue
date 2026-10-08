<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { refDebounced, onKeyStroke } from '@vueuse/core';
import { Plus, LayoutGrid, Table2, Inbox, Waves, Users } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import LeadFilterBar from '@/components/sales/LeadFilterBar.vue';
import LeadTable from '@/components/sales/LeadTable.vue';
import LeadKanban from '@/components/sales/LeadKanban.vue';
import BulkActionBar from '@/components/sales/BulkActionBar.vue';
import LeadDetailDrawer from '@/components/sales/LeadDetailDrawer.vue';
import AssignmentDrawer from '@/components/sales/drawers/AssignmentDrawer.vue';
import StatusChangeDrawer from '@/components/sales/drawers/StatusChangeDrawer.vue';
import LeadFormDrawer from '@/components/sales/drawers/LeadFormDrawer.vue';
import { useLeadsList, useLeadFlag, useConvertLead, useTrackLead } from '@/queries/leads';
import { useLeadStatuses } from '@/queries/salesReference';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import type { Lead, LeadFilters, LeadScope } from '@/types/sales';

defineOptions({ layout: null });

const props = withDefaults(
  defineProps<{ scope?: LeadScope; initialView?: 'table' | 'kanban' }>(),
  { scope: 'mine', initialView: 'table' },
);

const auth = useAuthStore();
const { confirm } = useConfirm();
const toast = useToast();
const statuses = useLeadStatuses();

const view = ref<'table' | 'kanban'>(props.initialView);
const filters = ref<LeadFilters>({});
const page = ref(1);
const pageSize = computed(() => (view.value === 'kanban' ? 100 : 25));
const debouncedSearch = refDebounced(
  computed(() => filters.value.search ?? ''),
  300,
);
const selected = ref<number[]>([]);

const params = computed(() => ({
  search: debouncedSearch.value || undefined,
  status_id: filters.value.status_id ?? undefined,
  owner_id: filters.value.owner_id ?? undefined,
  type: filters.value.type ?? undefined,
  page: page.value,
  page_size: pageSize.value,
}));

watch(
  () => [debouncedSearch.value, filters.value.status_id, filters.value.owner_id, filters.value.type, view.value],
  () => {
    page.value = 1;
    selected.value = [];
  },
);

const list = useLeadsList(
  computed(() => props.scope),
  params,
);
const rows = computed(() => list.data.value?.rows ?? []);

const scopeMeta = computed(
  () =>
    ({
      mine: { title: 'Leads', icon: Users, sub: 'Your assigned leads' },
      unassigned: { title: 'Inbox', icon: Inbox, sub: 'Unassigned new leads' },
      pool: { title: 'Public Sea', icon: Waves, sub: 'Abandoned & unassigned pool' },
    })[props.scope],
);

/* drawers */
const detailOpen = ref(false);
const activeLead = ref<Lead | null>(null);
const formOpen = ref(false);
const assignOpen = ref(false);
const assignIds = ref<number[]>([]);
const assignOwnerIds = ref<(number | null)[]>([]);
const statusOpen = ref(false);

function openDetail(lead: Lead) {
  activeLead.value = lead;
  detailOpen.value = true;
}
function newLead() {
  activeLead.value = null;
  formOpen.value = true;
}
function editLead() {
  formOpen.value = true;
}
function openAssign(ids: number[]) {
  // Resolve each lead's current owner so the drawer can require a reason on
  // reassignment (matches the backend rule).
  const byId = new Map<number, Lead>([
    ...rows.value.map((l) => [l.id, l] as const),
    ...(activeLead.value ? [[activeLead.value.id, activeLead.value] as const] : []),
  ]);
  assignIds.value = ids;
  assignOwnerIds.value = ids.map((id) => byId.get(id)?.owner_id ?? null);
  assignOpen.value = true;
}

/* actions */
const flag = useLeadFlag();
const convert = useConvertLead();
const track = useTrackLead();

async function onConvert() {
  if (!activeLead.value) return;
  const ok = await confirm({
    title: 'Convert to client',
    description: `Convert ${activeLead.value.name} into a client? This creates a client profile. KYC and trading setup are completed separately afterwards.`,
    confirmLabel: 'Convert',
    tone: 'success',
  });
  if (ok)
    convert.mutate(
      { id: activeLead.value.id, body: {} },
      { onSuccess: () => toast.success('Lead converted to client') },
    );
}
async function onAbandon() {
  if (!activeLead.value) return;
  const ok = await confirm({
    title: 'Release to public sea',
    description: `${activeLead.value.name} will return to the unassigned pool.`,
    confirmLabel: 'Release',
    tone: 'warning',
  });
  if (ok)
    flag.mutate(
      { action: 'abandon', id: activeLead.value.id, body: { reason: 'Released from workspace' } },
      { onSuccess: () => { toast.success('Lead released'); detailOpen.value = false; } },
    );
}
async function onRecover() {
  if (!activeLead.value) return;
  const ok = await confirm({
    title: 'Recover lead',
    description: `${activeLead.value.name} will be pulled back from the public sea.`,
    confirmLabel: 'Recover',
    tone: 'success',
  });
  if (ok)
    flag.mutate(
      { action: 'recover', id: activeLead.value.id },
      { onSuccess: () => { toast.success('Lead recovered'); detailOpen.value = false; } },
    );
}
async function onBlacklist() {
  if (!activeLead.value) return;
  const next = !activeLead.value.is_blacklisted;
  const ok = await confirm({
    title: next ? 'Blacklist lead' : 'Remove from blacklist',
    description: `${activeLead.value.name} will be ${next ? 'blacklisted' : 'reinstated'}.`,
    tone: next ? 'danger' : 'neutral',
  });
  if (ok)
    flag.mutate({ action: 'blacklist', id: activeLead.value.id, body: { blacklisted: next } });
}

/* kanban drag → track. Callback-required and backward (earlier-stage) moves
 * open the drawer so the user gets the callback field / backward-step
 * confirmation instead of a silent failure. */
function onKanbanMove({ leadId, statusId }: { leadId: number; statusId: number }) {
  const lead = rows.value.find((l) => l.id === leadId) ?? null;
  const target = statuses.byId.value.get(statusId);
  const current = lead?.status_id
    ? statuses.byId.value.get(lead.status_id)
    : undefined;
  const isBackward =
    !!current && !!target && target.sort_order < current.sort_order;

  if (target?.requires_callback || isBackward) {
    activeLead.value = lead;
    statusOpen.value = true;
    list.refetch(); // revert optimistic move until the drawer confirms
    return;
  }
  track.mutate(
    { id: leadId, body: { status_id: statusId } },
    {
      onSuccess: () => toast.success('Status updated'),
      onError: (e) => {
        if (isApiError(e)) toast.fromError(e);
        list.refetch();
      },
    },
  );
}

const viewOptions = [
  { value: 'table' as const, label: 'Table', icon: Table2 },
  { value: 'kanban' as const, label: 'Board', icon: LayoutGrid },
];

onKeyStroke('n', (e) => {
  const t = e.target as HTMLElement;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return;
  if (auth.can('leads.create')) { e.preventDefault(); newLead(); }
});
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-[100rem] space-y-4 p-4 sm:p-6">
      <!-- header -->
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <component :is="scopeMeta.icon" class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">{{ scopeMeta.title }}</h1>
            <p class="text-sm text-muted">{{ scopeMeta.sub }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <SegmentedControl v-model="view" :options="viewOptions" size="sm" aria-label="View" />
          <Button v-if="auth.can('leads.create')" @click="newLead">
            <Plus /> New lead
          </Button>
        </div>
      </header>

      <LeadFilterBar
        :filters="filters"
        :show-owner="scope !== 'mine'"
        @update:filters="filters = $event"
      />

      <LeadTable
        v-if="view === 'table'"
        :rows="rows"
        :loading="list.isLoading.value"
        :error="list.isError.value"
        :page="page"
        :page-size="pageSize"
        :total="list.data.value?.total ?? 0"
        :last-page="list.data.value?.last_page ?? 1"
        :selected="selected"
        @update:page="page = $event"
        @update:selected="selected = $event as number[]"
        @open="openDetail"
      />
      <LeadKanban
        v-else
        :leads="rows"
        :loading="list.isLoading.value"
        @open="openDetail"
        @move="onKanbanMove"
      />
    </div>

    <!-- bulk -->
    <BulkActionBar
      :count="selected.length"
      @assign="openAssign(selected)"
      @clear="selected = []"
    />

    <!-- detail + actions -->
    <LeadDetailDrawer
      v-model:open="detailOpen"
      :lead-id="activeLead?.id ?? null"
      @track="statusOpen = true"
      @assign="openAssign(activeLead ? [activeLead.id] : [])"
      @edit="editLead"
      @convert="onConvert"
      @abandon="onAbandon"
      @recover="onRecover"
      @blacklist="onBlacklist"
    />
    <StatusChangeDrawer
      v-if="activeLead"
      v-model:open="statusOpen"
      :lead-id="activeLead.id"
      :current-status-id="activeLead.status_id"
      @tracked="list.refetch()"
    />
    <AssignmentDrawer
      v-model:open="assignOpen"
      :lead-ids="assignIds"
      :owner-ids="assignOwnerIds"
      @assigned="selected = []; list.refetch()"
    />
    <LeadFormDrawer
      v-model:open="formOpen"
      :lead="activeLead"
      @saved="list.refetch()"
    />
  </AppLayout>
</template>
