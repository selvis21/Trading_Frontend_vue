<script setup lang="ts">
import { type Component } from 'vue';
import { cn } from '@/lib/utils';
import type { StatusTone } from '@/types';

/* Compact stat — a labelled value with an optional icon chip and tone.
 * Denser than KpiCard; used in detail headers, queue summaries, rails. */
const props = defineProps<{
  label: string;
  value: string | number;
  hint?: string;
  icon?: Component;
  tone?: StatusTone;
}>();

const toneChip: Record<StatusTone, string> = {
  neutral: 'bg-status-neutral/10 text-status-neutral',
  info: 'bg-status-info/10 text-status-info',
  warning: 'bg-status-warning/10 text-status-warning',
  success: 'bg-status-success/10 text-status-success',
  danger: 'bg-status-danger/10 text-status-danger',
  accent: 'bg-status-accent/10 text-status-accent',
};
</script>

<template>
  <div class="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
    <div
      v-if="icon"
      :class="
        cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md',
          toneChip[props.tone ?? 'neutral'],
        )
      "
    >
      <component :is="icon" class="size-4" />
    </div>
    <div class="min-w-0">
      <div class="text-lg font-semibold tabular-nums leading-tight text-fg">
        {{ value }}
      </div>
      <div class="truncate text-xs text-muted">{{ label }}</div>
    </div>
    <div v-if="hint" class="ms-auto text-xs text-muted">{{ hint }}</div>
  </div>
</template>
