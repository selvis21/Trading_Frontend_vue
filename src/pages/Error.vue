<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import Button from '@/components/ui/Button.vue';

defineOptions({ layout: null });

const props = defineProps<{ status: number }>();

const copy = computed(
  () =>
    ({
      403: { t: 'Access denied', d: "You don't have permission to view this." },
      404: { t: 'Not found', d: 'The page you are looking for does not exist.' },
      500: { t: 'Server error', d: 'Something went wrong on our end.' },
      503: { t: 'Unavailable', d: 'The service is temporarily offline.' },
    })[props.status] ?? { t: 'Error', d: 'An unexpected error occurred.' },
);
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
    <p class="font-mono text-5xl font-semibold text-primary">{{ status }}</p>
    <div>
      <h1 class="text-lg font-semibold text-fg">{{ copy.t }}</h1>
      <p class="mt-1 text-sm text-muted">{{ copy.d }}</p>
    </div>
    <Link href="/"><Button variant="outline">Back to home</Button></Link>
  </div>
</template>
