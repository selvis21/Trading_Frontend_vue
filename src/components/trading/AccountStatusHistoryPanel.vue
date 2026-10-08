<script setup lang="ts">
import { computed } from 'vue';
import { History } from '@lucide/vue';
import Timeline from '@/components/timeline/Timeline.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import { useTradingAccountHistory } from '@/queries/trading';
import { toneForStatus } from '@/composables/useStatusTone';
import type { TimelineEvent } from '@/types';

/* Append-only status-transition history for an account (from → to, reason,
 * actor). Rendered through the shared Timeline for visual parity with the
 * activity stream. */
const props = defineProps<{ accountId: number }>();

const q = useTradingAccountHistory(() => props.accountId);

function humanise(s: string | null | undefined): string {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const events = computed<TimelineEvent[]>(() =>
  (q.data.value ?? []).map((h) => ({
    id: h.id,
    type: String(h.to_status ?? 'status_changed'),
    title: `${humanise(h.from_status)} → ${humanise(h.to_status)}`,
    description: h.reason ?? undefined,
    tone: toneForStatus(h.to_status),
    at: h.created_at ?? '',
    actor: h.changed_by ? { name: `User #${h.changed_by}` } : undefined,
  })),
);
</script>

<template>
  <div>
    <SkeletonList v-if="q.isLoading.value" :rows="4" />
    <Timeline v-else :events="events" empty-title="No status changes" />
  </div>
</template>
