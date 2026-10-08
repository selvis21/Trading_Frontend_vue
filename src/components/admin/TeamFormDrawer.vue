<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Star, UserPlus } from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import Switch from '@/components/ui/Switch.vue';
import { cn } from '@/lib/utils';
import type { AdminUser, Team, TeamMemberInput } from '@/types/admin';

/* Team editor — meta fields plus member management. Membership is a
 * distinct endpoint (PUT .../members), so it has its own save action;
 * member rows carry a supervisor flag. Member management is edit-only
 * (the team must exist first). The page owns the mutations. */
const props = defineProps<{
  open: boolean;
  team: Team | null;
  users: AdminUser[];
  usersLoading?: boolean;
  submittingMeta?: boolean;
  submittingMembers?: boolean;
  canManage?: boolean;
}>();

const emit = defineEmits<{
  'update:open': [v: boolean];
  submit: [meta: { name: string; name_en: string | null; description: string | null; is_disabled: boolean }];
  syncMembers: [members: TeamMemberInput[]];
}>();

const isEdit = computed(() => props.team !== null);

const name = ref('');
const nameEn = ref('');
const description = ref('');
const isDisabled = ref(false);

/** user_id → membership flags */
const membership = ref<Map<number, { is_member: boolean; is_supervisor: boolean }>>(new Map());
const search = ref('');

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    name.value = props.team?.name ?? '';
    nameEn.value = props.team?.name_en ?? '';
    description.value = props.team?.description ?? '';
    isDisabled.value = props.team?.is_disabled ?? false;
    const map = new Map<number, { is_member: boolean; is_supervisor: boolean }>();
    (props.team?.members ?? []).forEach((m) =>
      map.set(m.id, { is_member: m.is_member, is_supervisor: m.is_supervisor }),
    );
    membership.value = map;
    search.value = '';
  },
  { immediate: true },
);

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.users;
  return props.users.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  );
});

const memberCount = computed(
  () => [...membership.value.values()].filter((m) => m.is_member).length,
);

function isMember(id: number) {
  return membership.value.get(id)?.is_member ?? false;
}
function isSupervisor(id: number) {
  return membership.value.get(id)?.is_supervisor ?? false;
}
function toggleMember(id: number) {
  if (!props.canManage) return;
  const next = new Map(membership.value);
  const cur = next.get(id) ?? { is_member: false, is_supervisor: false };
  const is_member = !cur.is_member;
  next.set(id, { is_member, is_supervisor: is_member ? cur.is_supervisor : false });
  membership.value = next;
}
function toggleSupervisor(id: number) {
  if (!props.canManage || !isMember(id)) return;
  const next = new Map(membership.value);
  const cur = next.get(id) ?? { is_member: true, is_supervisor: false };
  next.set(id, { ...cur, is_supervisor: !cur.is_supervisor });
  membership.value = next;
}

const metaValid = computed(() => name.value.trim().length > 0);

function submitMeta() {
  if (!metaValid.value || !props.canManage) return;
  emit('submit', {
    name: name.value.trim(),
    name_en: nameEn.value.trim() || null,
    description: description.value.trim() || null,
    is_disabled: isDisabled.value,
  });
}

function saveMembers() {
  if (!props.canManage) return;
  const list: TeamMemberInput[] = [];
  membership.value.forEach((flags, user_id) => {
    if (flags.is_member) {
      list.push({ user_id, is_member: true, is_supervisor: flags.is_supervisor });
    }
  });
  emit('syncMembers', list);
}

const fieldCls =
  'w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="34rem"
    :title="isEdit ? `Edit team · ${team?.name}` : 'New team'"
    :description="canManage ? undefined : 'Read-only.'"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-6">
      <!-- meta -->
      <div class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">Name <span class="text-status-danger">*</span></label>
          <input v-model="name" :disabled="!canManage" :class="fieldCls" placeholder="Team name" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">Name (EN)</label>
          <input v-model="nameEn" :disabled="!canManage" :class="fieldCls" placeholder="Optional" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">Description</label>
          <textarea v-model="description" :disabled="!canManage" rows="2" :class="fieldCls" placeholder="Optional" />
        </div>
        <div class="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <span class="text-sm text-fg">Disabled</span>
          <Switch :model-value="isDisabled" :disabled="!canManage" aria-label="Disabled" @update:model-value="isDisabled = $event" />
        </div>
        <div v-if="canManage" class="flex justify-end">
          <Button size="sm" :disabled="!metaValid" :loading="submittingMeta" @click="submitMeta">
            {{ isEdit ? 'Save details' : 'Create team' }}
          </Button>
        </div>
      </div>

      <!-- members (edit only) -->
      <div v-if="isEdit" class="space-y-3 border-t border-border pt-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm font-medium text-fg">
            <UserPlus class="size-4 text-muted" /> Members
            <span class="text-xs font-normal text-muted">({{ memberCount }})</span>
          </div>
          <Button
            v-if="canManage"
            variant="outline"
            size="sm"
            :loading="submittingMembers"
            @click="saveMembers"
          >
            Save members
          </Button>
        </div>

        <div class="relative">
          <Search class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input v-model="search" placeholder="Search staff…" :class="cn(fieldCls, 'ps-8')" />
        </div>

        <div class="max-h-72 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1">
          <div
            v-for="u in filteredUsers"
            :key="u.id"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted-surface"
          >
            <input
              type="checkbox"
              class="size-4 rounded border-input accent-primary"
              :checked="isMember(u.id)"
              :disabled="!canManage"
              @change="toggleMember(u.id)"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-fg">{{ u.name }}</p>
              <p class="truncate text-xs text-muted">{{ u.email }}</p>
            </div>
            <button
              type="button"
              :disabled="!canManage || !isMember(u.id)"
              :title="isSupervisor(u.id) ? 'Supervisor' : 'Mark as supervisor'"
              :class="
                cn(
                  'rounded-md p-1.5 transition-colors disabled:opacity-30',
                  isSupervisor(u.id) ? 'text-status-warning' : 'text-muted hover:text-fg',
                )
              "
              @click="toggleSupervisor(u.id)"
            >
              <Star :class="cn('size-4', isSupervisor(u.id) && 'fill-current')" />
            </button>
          </div>
          <p v-if="usersLoading" class="px-2 py-3 text-center text-xs text-muted">Loading staff…</p>
          <p v-else-if="!filteredUsers.length" class="px-2 py-3 text-center text-xs text-muted">No staff found.</p>
        </div>
      </div>
      <p v-else class="border-t border-border pt-4 text-xs text-muted">
        Create the team first, then reopen it to manage members.
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <Button variant="ghost" size="sm" @click="emit('update:open', false)">Close</Button>
      </div>
    </template>
  </Sheet>
</template>
