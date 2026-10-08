<script setup lang="ts">
import { Separator } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{
  orientation?: 'horizontal' | 'vertical';
  class?: string;
}>();
</script>

<template>
  <Separator
    :orientation="props.orientation ?? 'horizontal'"
    :class="
      cn(
        'shrink-0 bg-border',
        (props.orientation ?? 'horizontal') === 'vertical'
          ? 'h-full w-px'
          : 'h-px w-full',
        props.class,
      )
    "
  />
</template>
