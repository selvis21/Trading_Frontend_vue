<script lang="ts">
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background,color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0 select-none',
  {
    variants: {
      variant: {
        primary:
          /* Logo gold fill with charcoal text (6.87:1). --primary is the
           * text-safe gold and is only 2.00:1 on white as a fill.
           * RESERVED FOR THE BRAND CTA (Create / Save / Submit / the main
           * workflow action). Semantic colours must never be swapped for
           * gold just to make an action look more important. */
          'bg-brand text-brand-ink shadow-xs ring-1 ring-black/10 hover:bg-brand-hover',
        success:
          /* Confirming an outcome: Approve / Activate / Complete / Verify.
           * Text sits on --on-status, which flips light<->dark with the
           * theme so the fill is never below WCAG AA. */
          'bg-status-success text-on-status shadow-xs hover:bg-status-success/90',
        warning:
          /* Risky but non-destructive: Deactivate / Reset / Suspend. */
          'bg-status-warning text-on-status shadow-xs hover:bg-status-warning/90',
        danger:
          /* Destructive or terminal: Delete / Reject / Cancel. */
          'bg-status-danger text-on-status shadow-xs hover:bg-status-danger/90',
        info:
          /* Non-terminal workflow steps that still need attention. */
          'bg-status-info text-on-status shadow-xs hover:bg-status-info/90',
        secondary:
          'bg-muted-surface text-fg hover:bg-muted-surface/70 border border-border',
        outline:
          'border border-border bg-surface hover:bg-muted-surface text-fg',
        ghost: 'hover:bg-muted-surface text-fg',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-10 px-5',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Loader2 } from '@lucide/vue';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant'];
    size?: ButtonVariants['size'];
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    class?: string;
  }>(),
  { type: 'button' },
);

const classes = computed(() =>
  cn(buttonVariants({ variant: props.variant, size: props.size }), props.class),
);
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <Loader2 v-if="loading" class="animate-spin" />
    <slot />
  </button>
</template>
