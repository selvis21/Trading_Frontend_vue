<script setup lang="ts">
/* Grouped settings panel with a header and divided rows. */
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <section class="rounded-lg border border-border bg-surface">
    <header class="border-b border-border px-5 py-4">
      <h2 class="text-sm font-semibold text-fg">{{ title }}</h2>
      <p v-if="description" class="mt-0.5 text-sm text-muted">
        {{ description }}
      </p>
    </header>
    <div class="divide-y divide-border px-5">
      <slot />
    </div>
    <footer
      v-if="$slots.footer"
      class="flex items-center justify-end gap-2 border-t border-border bg-surface-sunken px-5 py-3"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>
