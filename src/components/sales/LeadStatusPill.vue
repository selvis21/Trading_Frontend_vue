<script setup lang="ts">
import { computed } from 'vue';
import Badge from '@/components/ui/Badge.vue';
import { toneForLeadStatus } from '@/composables/useStatusTone';
import type { LeadStatus } from '@/types/sales';

/* Lead status chip. Colour comes from the CENTRAL status mapping
 * (toneForLeadStatus), not from `lead_statuses.color` — that column is
 * NULL for every seeded row, so rendering from it made all six pipeline
 * statuses collapse to the same neutral grey. The colour admin override
 * is applied only when a status actually carries one. */
const props = defineProps<{
  statusId: number | null | undefined;
  statuses?: Map<number, LeadStatus>;
  fallback?: string;
}>();

const status = computed(() =>
  props.statusId != null ? props.statuses?.get(props.statusId) : undefined,
);
const tone = computed(() => toneForLeadStatus(status.value));
const label = computed(() => status.value?.name ?? props.fallback ?? '—');
</script>

<template>
  <Badge :tone="tone" :title="status?.name">
    <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />
    {{ label }}
  </Badge>
</template>