<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useInfiniteScroll } from '@vueuse/core';
import Timeline from '@/components/timeline/Timeline.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { useClientKycTimeline } from '@/queries/compliance';
import { useAccumulatedRows } from '@/composables/useAccumulatedRows';
import type { ComplianceActivity } from '@/types/compliance';
import type { StatusTone, TimelineEvent } from '@/types';

/* Infinite compliance activity timeline for a client. */
const props = defineProps<{ clientId: number }>();

const page = ref(1);
const q = useClientKycTimeline(() => props.clientId, page);
const all = useAccumulatedRows<ComplianceActivity>(
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
  profile_created: 'info',
  document_uploaded: 'neutral',
  document_approved: 'success',
  document_rejected: 'danger',
  application_submitted: 'info',
  review_started: 'info',
  application_approved: 'success',
  application_rejected: 'danger',
  resubmitted: 'warning',
  note_added: 'neutral',
  status_changed: 'info',
};
const events = computed<TimelineEvent[]>(() =>
  all.value.map((a) => ({
    id: a.id,
    type: a.type,
    title: (a.description ?? a.type).replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    tone: TONE[a.type] ?? 'neutral',
    at: a.created_at ?? '',
    actor: a.user_id ? { name: `User #${a.user_id}` } : undefined,
  })),
);
</script>

<template>
  <div ref="scroller" class="max-h-[60vh] overflow-y-auto">
    <SkeletonList v-if="q.isLoading.value && !events.length" :rows="5" />
    <Timeline v-else :events="events" empty-title="No compliance activity" />
    <div v-if="q.isFetching.value && events.length" class="flex justify-center py-3">
      <Spinner />
    </div>
  </div>
</template>
