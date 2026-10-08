<script setup lang="ts">
import { Loader2 } from '@lucide/vue';
import { cn } from '@/lib/utils';

defineProps<{ class?: string; label?: string }>();
</script>

<template>
  <span class="inline-flex items-center gap-2 text-muted" role="status">
    <Loader2 :class="cn('size-4 animate-spin', $props.class)" />
    <span v-if="label" class="text-sm">{{ label }}</span>
    <span v-else class="sr-only">Loading</span>
  </span>
</template>
