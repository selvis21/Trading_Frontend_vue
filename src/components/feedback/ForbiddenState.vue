<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ShieldX } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';

/* Inline 403 panel for permission-gated sections (use within a page when
 * a sub-resource is forbidden, rather than nuking the whole shell). */
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center"
  >
    <div
      class="mb-4 flex size-12 items-center justify-center rounded-full bg-status-warning/10 text-status-warning"
    >
      <ShieldX class="size-6" />
    </div>
    <h3 class="text-sm font-semibold text-fg">
      {{ title ?? 'You don’t have access' }}
    </h3>
    <p class="mt-1 max-w-sm text-sm text-muted">
      {{
        description ??
        'Your role doesn’t include permission for this area. Contact an administrator if you think this is a mistake.'
      }}
    </p>
    <Link href="/" class="mt-4">
      <Button variant="outline" size="sm">Back to home</Button>
    </Link>
  </div>
</template>
