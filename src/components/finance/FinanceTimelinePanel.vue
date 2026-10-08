<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useInfiniteScroll } from '@vueuse/core';
import Timeline from '@/components/timeline/Timeline.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { useClientFinanceTimeline } from '@/queries/finance';
import { useAccumulatedRows } from '@/composables/useAccumulatedRows';
import { useMoney } from '@/composables/useMoney';
import type { FinanceActivity } from '@/types/finance';
import type { StatusTone, TimelineEvent } from '@/types';

/* Infinite client finance activity timeline. Activity `properties.amount`
 * (integer minor units) is formatted through useMoney/formatMoney before
 * being folded into the event description — never parsed as a float. */
const props = defineProps<{ clientId: number }>();

const { formatMinor } = useMoney();

const page = ref(1);
const q = useClientFinanceTimeline(() => props.clientId, page);
const all = useAccumulatedRows<FinanceActivity>(
  () => props.clientId,
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
  transaction_created: 'info',
  transaction_approved: 'success',
  transaction_rejected: 'danger',
  transaction_completed: 'success',
  transaction_cancelled: 'neutral',
  deposit_posted: 'success',
  withdrawal_posted: 'warning',
  transfer_posted: 'info',
  credit_posted: 'accent',
  wallet_created: 'neutral',
  wallet_frozen: 'warning',
  wallet_unfrozen: 'success',
  note_added: 'neutral',
};

function titleFor(a: FinanceActivity): string {
  return (a.description ?? String(a.type ?? ''))
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function descFor(a: FinanceActivity): string | undefined {
  const amount = a.properties?.amount;
  if (typeof amount === 'number') {
    const currencyId =
      typeof a.properties?.currency_id === 'number' ? a.properties.currency_id : null;
    return formatMinor(amount, currencyId);
  }
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
    <Timeline v-else :events="events" empty-title="No finance activity" />
    <div v-if="q.isFetching.value && events.length" class="flex justify-center py-3">
      <Spinner />
    </div>
  </div>
</template>
