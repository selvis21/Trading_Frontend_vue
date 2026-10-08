<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { UsersRound, Plus, Search, Trash2 } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DataTable from '@/components/data/DataTable.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import TeamFormDrawer from '@/components/admin/TeamFormDrawer.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import {
  useTeams,
  useTeam,
  useUsers,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useSyncTeamMembers,
} from '@/queries/admin';
import type { Team, TeamMemberInput } from '@/types/admin';

/* Team administration — notification/scope groups with member
 * management (membership is a distinct endpoint). Gated behind
 * teams.manage. */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const canManage = computed(() => auth.can('teams.manage'));

const list = useTeams();
const create = useCreateTeam();
const update = useUpdateTeam();
const remove = useDeleteTeam();
const syncMembers = useSyncTeamMembers();

const search = ref('');
const page = ref(1);
const pageSize = 12;
watch(search, () => (page.value = 1));

const all = computed(() => list.data.value ?? []);
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return all.value;
  return all.value.filter(
    (t) => t.name.toLowerCase().includes(q) || (t.name_en ?? '').toLowerCase().includes(q),
  );
});
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const lastPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

/* Drawer + detail (members) */
const drawerOpen = ref(false);
const selectedId = ref<number | null>(null);
const selectedRow = ref<Team | null>(null);
const detail = useTeam(selectedId);
// Full record (with members) once loaded; falls back to the list row.
const activeTeam = computed(() => detail.data.value ?? selectedRow.value);

// Staff picker for membership.
const usersParams = computed(() => ({ page: 1, page_size: 200 }));
const users = useUsers(usersParams);

function openCreate() {
  selectedId.value = null;
  selectedRow.value = null;
  drawerOpen.value = true;
}
function openEdit(t: Team) {
  selectedRow.value = t;
  selectedId.value = t.id;
  drawerOpen.value = true;
}

function onSubmitMeta(meta: {
  name: string;
  name_en: string | null;
  description: string | null;
  is_disabled: boolean;
}) {
  const onError = (e: unknown) => toast.fromError(e);
  if (selectedId.value) {
    update.mutate(
      { id: selectedId.value, payload: meta },
      { onSuccess: () => toast.success('Team updated'), onError },
    );
  } else {
    create.mutate(
      { name: meta.name, name_en: meta.name_en, description: meta.description },
      {
        onSuccess: (team) => {
          toast.success('Team created');
          // Reopen as edit so members can be managed.
          selectedRow.value = team;
          selectedId.value = team.id;
        },
        onError,
      },
    );
  }
}

function onSyncMembers(members: TeamMemberInput[]) {
  if (!selectedId.value) return;
  syncMembers.mutate(
    { id: selectedId.value, members },
    {
      onSuccess: () => toast.success('Members updated'),
      onError: (e) => toast.fromError(e),
    },
  );
}

async function onDelete(t: Team) {
  const ok = await confirm({
    title: `Delete team “${t.name}”?`,
    description: 'Membership and notification scope will be removed. This cannot be undone.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  remove.mutate(t.id, {
    onSuccess: () => toast.success('Team deleted'),
    onError: (e) => toast.fromError(e),
  });
}

const columns = computed<ColumnDef<Team, any>[]>(() => [
  {
    accessorKey: 'name',
    header: 'Team',
    cell: ({ row }) =>
      h('div', {}, [
        h('p', { class: 'font-medium text-fg' }, row.original.name),
        row.original.name_en ? h('p', { class: 'text-xs text-muted' }, row.original.name_en) : null,
      ]),
  },
  {
    id: 'members',
    header: 'Members',
    cell: ({ row }) => h('span', { class: 'text-muted' }, `${row.original.members?.length ?? '—'}`),
  },
  {
    id: 'flags',
    header: 'Flags',
    cell: ({ row }) =>
      h('div', { class: 'flex gap-1' }, [
        row.original.is_system ? h(Badge, { tone: 'accent' }, () => 'System') : null,
        row.original.is_disabled ? h(Badge, { tone: 'neutral' }, () => 'Disabled') : null,
      ]),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      canManage.value && !row.original.is_system
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
          <UsersRound class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Teams</h1>
            <p class="text-sm text-muted">Notification & supervision scopes.</p>
          </div>
        </div>
        <Button v-if="canManage" size="sm" @click="openCreate"><Plus class="size-4" /> New team</Button>
      </header>

      <div class="relative max-w-sm">
        <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          v-model="search"
          placeholder="Search teams…"
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
        empty-title="No teams"
        empty-description="Create your first team."
        @update:page="page = $event"
        @row-click="openEdit"
        @retry="list.refetch()"
      />
    </div>

    <TeamFormDrawer
      :open="drawerOpen"
      :team="activeTeam"
      :users="users.data.value?.rows ?? []"
      :users-loading="users.isLoading.value"
      :can-manage="canManage"
      :submitting-meta="create.isPending.value || update.isPending.value"
      :submitting-members="syncMembers.isPending.value"
      @update:open="drawerOpen = $event"
      @submit="onSubmitMeta"
      @sync-members="onSyncMembers"
    />
  </AppLayout>
</template>
