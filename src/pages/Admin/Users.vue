<script setup lang="ts">
import { computed, ref, watch, h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { Users as UsersIcon, Plus, Search, Trash2, KeyRound } from '@lucide/vue';
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
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useSyncUserRoles,
  useResetUserPassword,
  useRoles,
  useBusinessUnits,
} from '@/queries/admin';
import { USER_LEVELS, USER_TYPES, USER_COLORS, SALES_AGENT_LEVEL, type AdminUser } from '@/types/admin';

/* Staff/operator administration — server-paginated, level-scoped. Drawer-
 * first CRUD with role assignment + password reset, gated behind the
 * granular users.* permissions. */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const canCreate = computed(() => auth.can('users.create'));
const canUpdate = computed(() => auth.can('users.update'));
const canDelete = computed(() => auth.can('users.delete'));
const canResetPw = computed(() => auth.can('users.password.reset'));
const canManage = computed(() => canCreate.value || canUpdate.value);

const search = ref('');
const levelFilter = ref<number | ''>('');
const statusFilter = ref<string>('');
const page = ref(1);
const pageSize = 25;
watch([search, levelFilter, statusFilter], () => (page.value = 1));

const params = computed(() => ({
  search: search.value.trim() || undefined,
  level: levelFilter.value || undefined,
  status: statusFilter.value || undefined,
  page: page.value,
  page_size: pageSize,
}));
const list = useUsers(params);
const rows = computed(() => list.data.value?.rows ?? []);

const roles = useRoles();
const businessUnits = useBusinessUnits();

const create = useCreateUser();
const update = useUpdateUser();
const remove = useDeleteUser();
const syncRoles = useSyncUserRoles();
const resetPw = useResetUserPassword();

const fields = computed<FieldDef[]>(() => [
  { key: 'first_name', label: 'First name', type: 'text', required: true },
  { key: 'last_name', label: 'Last name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'text', required: true, placeholder: 'name@firm.com' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'level', label: 'Level', type: 'select', required: true, options: USER_LEVELS, default: 6 },
  {
    // Sales type — backend (StoreUserRequest::withValidator) REQUIRES this for
    // level-6 Sales Agents (`user_type` in 0/1/2) and ignores it otherwise.
    // Shown + required only at level 6; hidden (and omitted from the payload)
    // for every other level, matching the API contract exactly.
    key: 'user_type',
    label: 'Sales type',
    type: 'select',
    required: true,
    options: USER_TYPES,
    showIf: (v: Record<string, unknown>) => Number(v.level) === SALES_AGENT_LEVEL,
    help: 'Required for Sales Agents (level 6).',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    default: 'active',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
  {
    key: 'business_unit_id',
    label: 'Business unit',
    type: 'select',
    options: (businessUnits.data.value ?? []).map((b) => ({ value: b.id, label: b.name })),
  },
  { key: 'head_id', label: 'Superior (head) ID', type: 'number', min: 1, help: 'Required for levels below Head.' },
  {
    // Owner colour(s) — the source of the lead-assignment colour. Sales staff
    // (level >= 4) need a colour to be assignable leads; setting it here lets
    // the Assignment drawer auto-select it. Optional at the API (colors is
    // nullable); the colour is enforced at assignment time, not here.
    key: 'colors',
    label: 'Owner colour',
    type: 'color',
    options: USER_COLORS,
    help: 'Lead owner colour for sales staff — auto-applied when leads are assigned to this user.',
  },
  {
    key: 'roles',
    label: 'Roles',
    type: 'multiselect',
    options: (roles.data.value ?? []).map((r) => ({ value: r.name, label: r.name })),
  },
  { key: 'password', label: 'Password', type: 'password', required: true, createOnly: true, help: 'Must be 12+ characters with uppercase, lowercase, numbers, and symbols—avoid personal info or reused passwords.' },
]);

const drawerOpen = ref(false);
const active = ref<AdminUser | null>(null);
function openCreate() {
  active.value = null;
  drawerOpen.value = true;
}
function openEdit(u: AdminUser) {
  if (!canManage.value) return;
  active.value = u;
  drawerOpen.value = true;
}

function onSubmit(values: Record<string, unknown>) {
  const roleList = (values.roles as string[]) ?? [];
  const onError = (e: unknown) => toast.fromError(e);

  if (active.value) {
    const id = active.value.id;
    const { roles: _omit, password: _pw, ...payload } = values;
    update.mutate(
      { id, payload },
      {
        onSuccess: () => {
          if (auth.can('roles.assign')) {
            syncRoles.mutate({ id, roles: roleList });
          }
          toast.success('User updated');
          drawerOpen.value = false;
        },
        onError,
      },
    );
  } else {
    const payload = { ...values, password_confirmation: values.password };
    create.mutate(payload as any, {
      onSuccess: () => {
        toast.success('User created');
        drawerOpen.value = false;
      },
      onError,
    });
  }
}

async function onDelete(u: AdminUser) {
  const ok = await confirm({
    title: `Delete ${u.name}?`,
    description: 'The user will lose access immediately. This cannot be undone.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  remove.mutate(u.id, {
    onSuccess: () => toast.success('User deleted'),
    onError: (e) => toast.fromError(e),
  });
}

async function onResetPassword(u: AdminUser) {
  const ok = await confirm({
    title: `Reset password for ${u.name}?`,
    description: 'A new temporary password will be set and the user must change it at next login.',
    confirmLabel: 'Reset',
    tone: 'warning',
  });
  if (!ok) return;
  const temp = `Tmp-${Math.abs(u.id * 7919).toString(36)}-${u.id}A!`;
  resetPw.mutate(
    { id: u.id, password: temp },
    {
      onSuccess: () => toast.success('Password reset', `Temporary: ${temp}`),
      onError: (e) => toast.fromError(e),
    },
  );
}

const columns = computed<ColumnDef<AdminUser, any>[]>(() => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', {
          class: cn('size-2 rounded-full', row.original.is_online ? 'bg-status-success' : 'bg-status-neutral/40'),
        }),
        h('div', {}, [
          h('p', { class: 'font-medium text-fg' }, row.original.name),
          h('p', { class: 'text-xs text-muted' }, row.original.email),
        ]),
      ]),
  },
  {
    accessorKey: 'level_label',
    header: 'Level',
    cell: ({ row }) => h('span', { class: 'text-muted' }, row.original.level_label ?? `L${row.original.level}`),
  },
  {
    accessorKey: 'roles',
    header: 'Roles',
    cell: ({ row }) =>
      h(
        'div',
        { class: 'flex flex-wrap gap-1' },
        (row.original.roles ?? []).length
          ? row.original.roles!.map((r) => h(Badge, { key: r, tone: 'info' }, () => r))
          : h('span', { class: 'text-xs text-muted' }, '—'),
      ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) =>
      h(Badge, { tone: row.original.status === 'active' ? 'success' : 'neutral' }, () =>
        row.original.status ?? '—',
      ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center justify-end gap-1' }, [
        canResetPw.value
          ? h(
              'button',
              {
                class: 'rounded-md p-1.5 text-muted transition-colors hover:bg-muted-surface hover:text-fg',
                title: 'Reset password',
                onClick: (e: MouseEvent) => {
                  e.stopPropagation();
                  onResetPassword(row.original);
                },
              },
              h(KeyRound, { class: 'size-4' }),
            )
          : null,
        canDelete.value
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
      ]),
  },
]);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <UsersIcon class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Users</h1>
            <p class="text-sm text-muted">Staff & operator accounts.</p>
          </div>
        </div>
        <Button v-if="canCreate" size="sm" @click="openCreate"><Plus class="size-4" /> New user</Button>
      </header>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative max-w-sm flex-1">
          <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            v-model="search"
            placeholder="Search name or email…"
            class="w-full rounded-md border border-input bg-surface py-2 ps-8 pe-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          v-model="levelFilter"
          class="rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All levels</option>
          <option v-for="l in USER_LEVELS" :key="l.value" :value="l.value">{{ l.label }}</option>
        </select>
        <select
          v-model="statusFilter"
          class="rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <DataTable
        :data="rows"
        :columns="columns"
        :loading="list.isLoading.value"
        :error="list.isError.value"
        :page="page"
        :page-size="pageSize"
        :total="list.data.value?.total ?? 0"
        :last-page="list.data.value?.last_page ?? 1"
        :row-key="(r) => r.id"
        empty-title="No users"
        empty-description="No staff accounts match these filters."
        @update:page="page = $event"
        @row-click="openEdit"
        @retry="list.refetch()"
      />
    </div>

    <EntityFormDrawer
      :open="drawerOpen"
      :title="active ? `Edit user · ${active.name}` : 'New user'"
      :record="active"
      :fields="fields"
      :can-manage="canManage"
      :submitting="create.isPending.value || update.isPending.value || syncRoles.isPending.value"
      @update:open="drawerOpen = $event"
      @submit="onSubmit"
    />
  </AppLayout>
</template>
