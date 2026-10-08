<script lang="ts">
import { cva, type VariantProps } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium leading-tight transition-colors',
  {
    variants: {
      tone: {
        neutral:
          'border-status-neutral/20 bg-status-neutral/10 text-status-neutral',
        info: 'border-status-info/20 bg-status-info/10 text-status-info',
        warning:
          'border-status-warning/25 bg-status-warning/10 text-status-warning',
        success:
          'border-status-success/20 bg-status-success/10 text-status-success',
        danger:
          'border-status-danger/20 bg-status-danger/10 text-status-danger',
        accent:
          'border-status-accent/20 bg-status-accent/10 text-status-accent',
      },
      solid: { true: 'text-white border-transparent', false: '' },
    },
    defaultVariants: { tone: 'neutral', solid: false },
  },
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  tone?: BadgeVariants['tone'];
  solid?: boolean;
  class?: string;
}>();

const classes = computed(() =>
  cn(badgeVariants({ tone: props.tone, solid: props.solid }), props.class),
);
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
