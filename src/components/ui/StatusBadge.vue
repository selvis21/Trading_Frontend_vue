<script setup lang="ts">
import { computed } from 'vue';
import Badge from './Badge.vue';
import { toneForStatus } from '@/composables/useStatusTone';
import type { StatusTone } from '@/types';

/* Canonical status pill: maps any enum value → tone + glyph + label.
 * Colorblind-safe (color + a leading dot/shape). */
const props = defineProps<{
  status: string | null | undefined;
  /** Override the auto-derived tone if needed. */
  tone?: StatusTone;
  /** Override the displayed label (defaults to a humanised status). */
  label?: string;
}>();

const resolvedTone = computed<StatusTone>(
  () => props.tone ?? toneForStatus(props.status),
);
const text = computed(
  () =>
    props.label ??
    (props.status ?? '—')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
);
</script>

<template>
  <Badge :tone="resolvedTone">
    <span
      class="size-1.5 rounded-full bg-current"
      aria-hidden="true"
    />
    {{ text }}
  </Badge>
</template>
