<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { ShieldCheck, Plus, Search, Trash2 } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DataTable from '@/components/data/DataTable.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import RoleFormDrawer from '@/components/admin/RoleFormDrawer.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import {
  useRoles,
  usePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from '@/queries/admin';
import type { Role } from '@/types/admin';

/* Role & permission administration — name + grouped permission matrix.
 * Writes gated behind roles.manage; deletes are optimistic. */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const canManage = computed(() => auth.can('roles.manage'));

const list = useRoles();
const permissions = usePermissions();
const create = useCreateRole();
const update = useUpdateRole();
const remove = useDeleteRole();

const search = ref('');
const page = ref(1);
const pageSize = 12;
watch(search, () => (page.value = 1));

const all = computed(() => list.data.value ?? []);
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return all.value;
  return all.value.filter((r) => r.name.toLowerCase().includes(q));
});
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const lastPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

const drawerOpen = ref(false);
const active = ref<Role | null>(null);
function openCreate() {
  active.value = null;
  drawerOpen.value = true;
}
function openEdit(r: Role) {
  active.value = r;
  drawerOpen.value = true;
}

function onSubmit(values: { name: string; permissions: string[] }) {
  const onSuccess = () => {
    toast.success(active.value ? 'Role updated' : 'Role created');
    drawerOpen.value = false;
  };
  const onError = (e: unknown) => toast.fromError(e);
  if (active.value) {
    update.mutate({ id: active.value.id, payload: values }, { onSuccess, onError });
  } else {
    create.mutate(values, { onSuccess, onError });
  }
}

async function onDelete(r: Role) {
  const ok = await confirm({
    title: `Delete role “${r.name}”?`,
    description: 'Users currently holding this role will lose its permissions. This cannot be undone.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  remove.mutate(r.id, {
    onSuccess: () => toast.success('Role deleted'),
    onError: (e) => toast.fromError(e),
  });
}

const columns = computed<ColumnDef<Role, any>[]>(() => [
  {
    accessorKey: 'name',
    header: 'Role',
    cell: ({ row }) => h('span', { class: 'font-medium text-fg' }, row.original.name),
  },
  {
    id: 'permissions',
    header: 'Permissions',
    cell: ({ row }) =>
      h(Badge, { tone: (row.original.permissions?.length ?? 0) > 0 ? 'info' : 'neutral' }, () =>
        `${row.original.permissions?.length ?? 0} granted`,
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
          <ShieldCheck class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Roles & Permissions</h1>
            <p class="text-sm text-muted">Define what each role can do.</p>
          </div>
        </div>
        <Button v-if="canManage" size="sm" @click="openCreate"><Plus class="size-4" /> New role</Button>
      </header>

      <div class="relative max-w-sm">
        <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          v-model="search"
          placeholder="Search roles…"
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
        empty-title="No roles"
        empty-description="Create your first role."
        @update:page="page = $event"
        @row-click="openEdit"
        @retry="list.refetch()"
      />
    </div>

    <RoleFormDrawer
      :open="drawerOpen"
      :role="active"
      :permissions="permissions.data.value ?? []"
      :can-manage="canManage"
      :submitting="create.isPending.value || update.isPending.value"
      @update:open="drawerOpen = $event"
      @submit="onSubmit"
    />
  </AppLayout>
</template>
