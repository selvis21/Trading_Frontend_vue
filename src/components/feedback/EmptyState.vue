<script setup lang="ts">
import { type Component } from 'vue';
import { Inbox } from '@lucide/vue';

/* Designed empty state — never a blank surface. */
defineProps<{
  title: string;
  description?: string;
  icon?: Component;
}>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center"
  >
    <div
      class="mb-4 flex size-12 items-center justify-center rounded-full bg-muted-surface text-muted"
    >
      <component :is="icon ?? Inbox" class="size-6" />
    </div>
    <h3 class="text-sm font-semibold text-fg">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-muted">
      {{ description }}
    </p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
