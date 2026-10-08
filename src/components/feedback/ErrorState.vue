<script setup lang="ts">
import { TriangleAlert, RefreshCw } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';

defineProps<{
  title?: string;
  description?: string;
}>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-lg border border-status-danger/20 bg-status-danger/5 px-6 py-12 text-center"
  >
    <div
      class="mb-4 flex size-12 items-center justify-center rounded-full bg-status-danger/10 text-status-danger"
    >
      <TriangleAlert class="size-6" />
    </div>
    <h3 class="text-sm font-semibold text-fg">
      {{ title ?? 'Something went wrong' }}
    </h3>
    <p class="mt-1 max-w-sm text-sm text-muted">
      {{ description ?? 'The data could not be loaded. Please try again.' }}
    </p>
    <Button variant="outline" size="sm" class="mt-4" @click="emit('retry')">
      <RefreshCw class="size-4" />
      Retry
    </Button>
  </div>
</template>
