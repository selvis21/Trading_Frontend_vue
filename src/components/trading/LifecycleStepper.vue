<script setup lang="ts">
import { computed } from 'vue';
import { Check, Circle, Ban, XCircle } from '@lucide/vue';
import { cn } from '@/lib/utils';
import type { TradingAccountStatus } from '@/types/trading';

/* Visual account lifecycle: pending → active → suspended/closed. A rejected
 * request never becomes an account, so a rejected status renders its own
 * terminal track. The reached step is emphasised; future steps are muted. */
const props = defineProps<{ status: TradingAccountStatus | null | undefined }>();

type Step = { key: string; label: string };

const track = computed<Step[]>(() => {
  if (props.status === 'rejected') {
    return [
      { key: 'pending', label: 'Requested' },
      { key: 'rejected', label: 'Rejected' },
    ];
  }
  const base: Step[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'active', label: 'Active' },
  ];
  if (props.status === 'suspended') base.push({ key: 'suspended', label: 'Suspended' });
  base.push({ key: 'closed', label: 'Closed' });
  return base;
});

const reachedIndex = computed(() =>
  track.value.findIndex((s) => s.key === props.status),
);

function stateOf(i: number): 'done' | 'current' | 'upcoming' {
  if (i < reachedIndex.value) return 'done';
  if (i === reachedIndex.value) return 'current';
  return 'upcoming';
}

function iconFor(step: Step, state: string) {
  if (step.key === 'rejected') return XCircle;
  if (step.key === 'suspended') return Ban;
  return state === 'done' ? Check : Circle;
}
</script>

<template>
  <ol class="flex items-center gap-1">
    <li
      v-for="(step, i) in track"
      :key="step.key"
      class="flex flex-1 items-center gap-1.5 last:flex-none"
    >
      <span
        :class="
          cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
            stateOf(i) === 'current' && step.key === 'suspended' && 'border-status-warning bg-status-warning/10 text-status-warning',
            stateOf(i) === 'current' && step.key === 'rejected' && 'border-status-danger bg-status-danger/10 text-status-danger',
            stateOf(i) === 'current' && step.key === 'closed' && 'border-status-danger bg-status-danger/10 text-status-danger',
            stateOf(i) === 'current' && ['pending', 'active'].includes(step.key) && 'border-primary bg-primary/10 text-primary',
            stateOf(i) === 'done' && 'border-status-success bg-status-success/10 text-status-success',
            stateOf(i) === 'upcoming' && 'border-border text-muted',
          )
        "
      >
        <component :is="iconFor(step, stateOf(i))" class="size-3.5" />
      </span>
      <span
        :class="
          cn(
            'whitespace-nowrap text-xs font-medium',
            stateOf(i) === 'current' ? 'text-fg' : 'text-muted',
          )
        "
      >
        {{ step.label }}
      </span>
      <span
        v-if="i < track.length - 1"
        :class="
          cn(
            'h-px flex-1',
            stateOf(i) === 'done' ? 'bg-status-success/40' : 'bg-border',
          )
        "
      />
    </li>
  </ol>
</template>
