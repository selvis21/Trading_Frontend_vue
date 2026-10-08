<script setup lang="ts">
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui';

const props = defineProps<{
  label: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}>();
</script>

<template>
  <TooltipProvider :delay-duration="props.delay ?? 300">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          :side="props.side ?? 'right'"
          :side-offset="6"
          class="z-50 rounded-md border border-border bg-surface-raised px-2 py-1 text-xs font-medium text-fg shadow-md data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in data-[state=delayed-open]:zoom-in-95"
        >
          {{ props.label }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
