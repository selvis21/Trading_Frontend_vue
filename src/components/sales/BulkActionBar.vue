<script setup lang="ts">
import { UserPlus, X } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import { useAuthStore } from '@/stores/auth';

/* Floating bar shown when leads are multi-selected in the table. */
defineProps<{ count: number }>();
const emit = defineEmits<{ assign: []; clear: [] }>();
const auth = useAuthStore();
</script>

<template>
  <Transition
    enter-active-class="transition duration-200"
    enter-from-class="translate-y-2 opacity-0"
    leave-active-class="transition duration-150"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div
      v-if="count > 0"
      class="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit items-center gap-3 rounded-full border border-border bg-surface-raised px-4 py-2 shadow-lg"
    >
      <span class="text-sm font-medium text-fg">
        {{ count }} selected
      </span>
      <span class="h-4 w-px bg-border" />
      <Button
        v-if="auth.can('leads.assign')"
        size="sm"
        @click="emit('assign')"
      >
        <UserPlus class="size-4" /> Assign
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Clear selection" @click="emit('clear')">
        <X class="size-4" />
      </Button>
    </div>
  </Transition>
</template>
