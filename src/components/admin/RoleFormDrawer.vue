<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import { cn } from '@/lib/utils';
import type { Permission, Role } from '@/types/admin';

/* Role editor — name + a grouped permission matrix (permissions are
 * grouped by their domain prefix, e.g. `finance.*`). Drawer-first; the
 * page owns the create/update mutation + optimistic cache writes. */
const props = defineProps<{
  open: boolean;
  role: Role | null;
  permissions: Permission[];
  submitting?: boolean;
  canManage?: boolean;
}>();

const emit = defineEmits<{
  'update:open': [v: boolean];
  submit: [values: { name: string; permissions: string[] }];
}>();

const isEdit = computed(() => props.role !== null);
const name = ref('');
const selected = ref<Set<string>>(new Set());

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    name.value = props.role?.name ?? '';
    selected.value = new Set(props.role?.permissions ?? []);
  },
  { immediate: true },
);

/** Permissions grouped by the segment before the first dot. */
const groups = computed(() => {
  const map = new Map<string, Permission[]>();
  for (const p of [...props.permissions].sort((a, b) => a.name.localeCompare(b.name))) {
    const key = p.name.split('.')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
});

function toggle(perm: string) {
  if (!props.canManage) return;
  const next = new Set(selected.value);
  next.has(perm) ? next.delete(perm) : next.add(perm);
  selected.value = next;
}

function toggleGroup(perms: Permission[]) {
  if (!props.canManage) return;
  const next = new Set(selected.value);
  const allOn = perms.every((p) => next.has(p.name));
  perms.forEach((p) => (allOn ? next.delete(p.name) : next.add(p.name)));
  selected.value = next;
}

function groupState(perms: Permission[]): 'all' | 'some' | 'none' {
  const on = perms.filter((p) => selected.value.has(p.name)).length;
  return on === 0 ? 'none' : on === perms.length ? 'all' : 'some';
}

const valid = computed(() => name.value.trim().length > 0);

function submit() {
  if (!valid.value || !props.canManage) return;
  emit('submit', { name: name.value.trim(), permissions: [...selected.value] });
}

const fieldCls =
  'w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="34rem"
    :title="isEdit ? `Edit role · ${role?.name}` : 'New role'"
    :description="canManage ? 'Assign the granular permissions this role grants.' : 'Read-only.'"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Role name <span class="text-status-danger">*</span></label>
        <input
          v-model="name"
          :disabled="!canManage"
          placeholder="e.g. finance-manager"
          :class="fieldCls"
        />
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-fg">Permissions</span>
          <span class="text-xs text-muted">{{ selected.size }} selected</span>
        </div>

        <div v-for="[group, perms] in groups" :key="group" class="rounded-lg border border-border">
          <button
            type="button"
            :disabled="!canManage"
            class="flex w-full items-center justify-between gap-2 border-b border-border bg-surface-sunken px-3 py-2 text-start"
            @click="toggleGroup(perms)"
          >
            <span class="text-xs font-semibold uppercase tracking-wide text-muted">{{ group }}</span>
            <span
              :class="
                cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium',
                  groupState(perms) === 'all' && 'bg-primary/10 text-primary',
                  groupState(perms) === 'some' && 'bg-status-warning/10 text-status-warning',
                  groupState(perms) === 'none' && 'bg-muted-surface text-muted',
                )
              "
            >
              {{ groupState(perms) === 'all' ? 'All' : groupState(perms) === 'some' ? 'Partial' : 'None' }}
            </span>
          </button>
          <div class="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2">
            <label
              v-for="p in perms"
              :key="p.name"
              :class="
                cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted-surface',
                  !canManage && 'cursor-not-allowed opacity-70',
                )
              "
            >
              <input
                type="checkbox"
                class="size-4 rounded border-input accent-primary"
                :checked="selected.has(p.name)"
                :disabled="!canManage"
                @change="toggle(p.name)"
              />
              <span class="truncate font-mono text-xs text-fg">{{ p.name }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="emit('update:open', false)">
          {{ canManage ? 'Cancel' : 'Close' }}
        </Button>
        <Button v-if="canManage" size="sm" :disabled="!valid" :loading="submitting" @click="submit">
          {{ isEdit ? 'Save role' : 'Create role' }}
        </Button>
      </div>
    </template>
  </Sheet>
</template>
