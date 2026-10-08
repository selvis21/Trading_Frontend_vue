<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  modelValue?: string | number;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  class?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const classes = computed(() =>
  cn(
    'flex h-9 w-full rounded-md border border-input bg-surface px-3 py-1 text-sm text-fg shadow-xs transition-colors',
    'placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
    'disabled:cursor-not-allowed disabled:opacity-50',
    props.invalid && 'border-status-danger focus-visible:ring-status-danger',
    props.class,
  ),
);
</script>

<template>
  <input
    :type="type ?? 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :aria-invalid="invalid || undefined"
    :class="classes"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
