<script setup lang="ts">
/* A labelled settings row: title + description on the left, control on
 * the right (Stripe/HubSpot settings convention). Stacks on mobile. */
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div
    class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="min-w-0 sm:pe-6">
      <p class="text-sm font-medium text-fg">{{ title }}</p>
      <p v-if="description" class="mt-0.5 text-sm text-muted">
        {{ description }}
      </p>
    </div>
    <div class="shrink-0">
      <slot />
    </div>
  </div>
</template>
