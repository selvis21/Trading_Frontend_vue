<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui';
import { X } from '@lucide/vue';
import { cn } from '@/lib/utils';

/* Centered modal dialog (focus-trapped, esc-dismiss, scroll-locked).
 *
 * Layer scale (single source of truth for the app's stacking order):
 *   Drawer/Sheet z-50 · popovers z-[60-70] · base Modal z-[80]
 *   · document viewer z-[90] · nested/elevated dialog z-[95] · loading z-[100]
 * A dialog opened *from within* another dialog (e.g. an approve/reject reason
 * over the document viewer) must pass `layer="elevated"` so it stays on top. */
const props = defineProps<{
  open: boolean;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  layer?: 'base' | 'elevated';
  class?: string;
}>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

const layerClass = {
  base: 'z-[80]',
  elevated: 'z-[95]',
};
</script>

<template>
  <DialogRoot :open="props.open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay
        :class="
          cn(
            'fixed inset-0 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out',
            layerClass[props.layer ?? 'base'],
          )
        "
      />
      <DialogContent
        :class="
          cn(
            'fixed left-1/2 top-1/2 grid w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-surface-raised p-6 shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 duration-150',
            layerClass[props.layer ?? 'base'],
            sizeClass[props.size ?? 'md'],
            props.class,
          )
        "
      >
        <div v-if="title || description" class="space-y-1.5">
          <DialogTitle v-if="title" class="text-base font-semibold text-fg">
            {{ title }}
          </DialogTitle>
          <DialogDescription v-if="description" class="text-sm text-muted">
            {{ description }}
          </DialogDescription>
        </div>

        <slot />

        <DialogClose
          class="absolute end-4 top-4 rounded-sm text-muted opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close"
        >
          <X class="size-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
