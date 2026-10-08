<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useInfiniteScroll } from '@vueuse/core';
import Timeline from '@/components/timeline/Timeline.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { useTradingAccountTimeline } from '@/queries/trading';
import { useAccumulatedRows } from '@/composables/useAccumulatedRows';
import type { TradingActivity } from '@/types/trading';
import type { StatusTone, TimelineEvent } from '@/types';

/* Infinite trading-activity timeline for one account. Pages accumulate as
 * the user scrolls; new ids are de-duped on append. */
const props = defineProps<{ accountId: number }>();

const page = ref(1);
const q = useTradingAccountTimeline(() => props.accountId, page);
const all = useAccumulatedRows<TradingActivity>(
  () => props.accountId,
  page,
  () => q.data.value,
);
const lastPage = computed(() => q.data.value?.last_page ?? 1);

const scroller = useTemplateRef<HTMLElement>('scroller');
useInfiniteScroll(
  scroller,
  () => {
    if (page.value < lastPage.value && !q.isFetching.value) page.value += 1;
  },
  { distance: 60 },
);

const TONE: Record<string, StatusTone> = {
  requested: 'info',
  request_approved: 'success',
  request_rejected: 'danger',
  request_cancelled: 'neutral',
  account_created: 'success',
  account_suspended: 'warning',
  account_resumed: 'success',
  account_closed: 'danger',
  leverage_changed: 'info',
  status_changed: 'info',
};

function titleFor(a: TradingActivity): string {
  const base = (a.description ?? String(a.type ?? ''))
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return base || 'Activity';
}

function descFor(a: TradingActivity): string | undefined {
  const p = a.properties ?? {};
  if (a.type === 'leverage_changed' && p.from != null && p.to != null) {
    return `1:${p.from} → 1:${p.to}`;
  }
  if (typeof p.reason === 'string' && p.reason) return p.reason;
  if (p.from != null && p.to != null) return `${p.from} → ${p.to}`;
  return undefined;
}

const events = computed<TimelineEvent[]>(() =>
  all.value.map((a) => ({
    id: a.id,
    type: String(a.type ?? ''),
    title: titleFor(a),
    description: descFor(a),
    tone: TONE[String(a.type ?? '')] ?? 'neutral',
    at: a.created_at ?? '',
    actor: a.user_id ? { name: `User #${a.user_id}` } : undefined,
  })),
);
</script>

<template>
  <div ref="scroller" class="max-h-[70vh] overflow-y-auto">
    <SkeletonList v-if="q.isLoading.value && !events.length" :rows="5" />
    <Timeline v-else :events="events" empty-title="No account activity" />
    <div v-if="q.isFetching.value && events.length" class="flex justify-center py-3">
      <Spinner />
    </div>
  </div>
</template>
