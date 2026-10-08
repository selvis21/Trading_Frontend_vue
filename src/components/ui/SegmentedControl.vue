<script setup lang="ts" generic="T extends string | number">
import { type Component } from 'vue';
import { cn } from '@/lib/utils';

/* Segmented radio control (theme/density/locale pickers). Keyboard-
 * operable, ARIA radiogroup semantics. */
interface Option<V> {
  value: V;
  label: string;
  icon?: Component;
}

const props = defineProps<{
  modelValue: T;
  options: Option<T>[];
  ariaLabel?: string;
  size?: 'sm' | 'md';
}>();
const emit = defineEmits<{ 'update:modelValue': [value: T] }>();
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="ariaLabel"
    class="inline-flex rounded-lg border border-border bg-surface-sunken p-0.5"
  >
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      role="radio"
      :aria-checked="opt.value === modelValue"
      :class="
        cn(
          'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
          size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
          opt.value === modelValue
            ? 'bg-brand text-brand-ink shadow-xs'
            : 'text-muted hover:text-fg',
        )
      "
      @click="emit('update:modelValue', opt.value)"
    >
      <component :is="opt.icon" v-if="opt.icon" class="size-3.5" />
      {{ opt.label }}
    </button>
  </div>
</template>
