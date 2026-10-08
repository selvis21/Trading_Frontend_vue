<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
} from 'reka-ui';
import { Check, ChevronDown, Search } from '@lucide/vue';
import Avatar from '@/components/ui/Avatar.vue';
import { cn } from '@/lib/utils';
import { useAssignableUsers } from '@/queries/salesReference';

/* Searchable single-select user picker (assignment + mention). */
const props = defineProps<{
  modelValue: number | null;
  placeholder?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>();

const q = useAssignableUsers();
const open = ref(false);
const search = ref('');

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  const users = q.data.value ?? [];
  return term
    ? users.filter((u) => u.name.toLowerCase().includes(term))
    : users;
});
const selected = computed(() =>
  q.data.value?.find((u) => u.id === props.modelValue),
);

function pick(id: number) {
  emit('update:modelValue', id);
  open.value = false;
  search.value = '';
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger
      class="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <template v-if="selected">
        <Avatar :name="selected.name" size="xs" />
        <span class="truncate text-fg">{{ selected.name }}</span>
      </template>
      <span v-else class="text-muted">{{ placeholder ?? 'Select user…' }}</span>
      <ChevronDown class="ms-auto size-4 shrink-0 text-muted" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        align="start"
        :side-offset="4"
        class="z-50 w-[var(--reka-popover-trigger-width)] overflow-hidden rounded-md border border-border bg-surface-raised shadow-md data-[state=open]:animate-in data-[state=open]:fade-in"
      >
        <div class="flex items-center gap-2 border-b border-border px-3">
          <Search class="size-4 text-muted" />
          <input
            v-model="search"
            class="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted"
            placeholder="Search users…"
          />
        </div>
        <ul class="max-h-60 overflow-y-auto p-1">
          <li v-if="q.isLoading.value" class="px-2 py-3 text-center text-sm text-muted">
            Loading…
          </li>
          <li
            v-else-if="!filtered.length"
            class="px-2 py-3 text-center text-sm text-muted"
          >
            No users found
          </li>
          <li v-for="user in filtered" :key="user.id">
            <button
              :class="
                cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted-surface',
                  user.id === modelValue && 'bg-primary/10',
                )
              "
              @click="pick(user.id)"
            >
              <Avatar :name="user.name" size="xs" />
              <span class="min-w-0 flex-1 truncate text-fg">{{ user.name }}</span>
              <span v-if="user.level_label" class="text-xs text-muted">
                {{ user.level_label }}
              </span>
              <Check
                v-if="user.id === modelValue"
                class="size-4 text-primary"
              />
            </button>
          </li>
        </ul>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
