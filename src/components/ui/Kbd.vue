<script setup lang="ts">
import { cn } from '@/lib/utils';

defineProps<{ class?: string }>();
</script>

<template>
  <kbd
    :class="
      cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted-surface px-1.5 font-mono text-[10px] font-medium text-muted',
        $props.class,
      )
    "
  >
    <slot />
  </kbd>
</template>
