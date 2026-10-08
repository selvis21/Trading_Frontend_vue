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

/* Edge-anchored slide-over. Powers both Drawer (right) and Sheet (any
 * side). URL-addressability is handled by the caller. */
const props = defineProps<{
  open: boolean;
  side?: 'right' | 'left' | 'top' | 'bottom';
  title?: string;
  description?: string;
  width?: string;
  class?: string;
}>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const side = props.side ?? 'right';

const sideClass: Record<string, string> = {
  right:
    'inset-y-0 end-0 h-full border-s data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
  left: 'inset-y-0 start-0 h-full border-e data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
  top: 'inset-x-0 top-0 w-full border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top',
  bottom:
    'inset-x-0 bottom-0 w-full border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
};
const isVertical = side === 'right' || side === 'left';
</script>

<template>
  <DialogRoot :open="props.open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out"
      />
      <DialogContent
        :style="isVertical ? { width: props.width ?? '28rem' } : undefined"
        :class="
          cn(
            'fixed z-50 flex max-w-[calc(100vw-2rem)] flex-col bg-surface-raised shadow-lg outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out duration-200',
            sideClass[side],
            props.class,
          )
        "
      >
        <header
          v-if="title || $slots.header"
          class="flex items-start justify-between gap-4 border-b border-border px-5 py-4"
        >
          <div class="min-w-0">
            <slot name="header">
              <DialogTitle class="truncate text-sm font-semibold text-fg">
                {{ title }}
              </DialogTitle>
              <DialogDescription
                v-if="description"
                class="mt-0.5 text-xs text-muted"
              >
                {{ description }}
              </DialogDescription>
            </slot>
          </div>
          <DialogClose
            class="rounded-sm text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X class="size-4" />
          </DialogClose>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <slot />
        </div>

        <footer
          v-if="$slots.footer"
          class="border-t border-border px-5 py-4"
        >
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
