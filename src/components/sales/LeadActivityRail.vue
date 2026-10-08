<script setup lang="ts">
import { computed, ref } from 'vue';
import { History } from '@lucide/vue';
import NoteComposer from './NoteComposer.vue';
import MentionComposer from './MentionComposer.vue';
import Timeline from '@/components/timeline/Timeline.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import { useLeadTimeline, useLeadNotes } from '@/queries/leads';
import type { StatusTone, TimelineEvent } from '@/types';

/* The workspace right rail: quick note + reminder composers over a live
 * recent-activity feed for the lead. */
const props = defineProps<{ leadId: number }>();

const page = ref(1);
const timeline = useLeadTimeline(() => props.leadId, page);
const notes = useLeadNotes(() => props.leadId);

const TONE: Record<string, StatusTone> = {
  status_changed: 'info',
  assigned: 'accent',
  reassigned: 'accent',
  converted: 'success',
  abandoned: 'danger',
  blacklisted: 'danger',
  note_added: 'neutral',
  followup_scheduled: 'warning',
};
const events = computed<TimelineEvent[]>(() =>
  (timeline.data.value?.rows ?? []).slice(0, 10).map((a) => ({
    id: a.id,
    type: a.type,
    title: a.type.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: a.description ?? undefined,
    tone: TONE[a.type] ?? 'neutral',
    at: a.created_at ?? '',
  })),
);
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <section class="space-y-2">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">Add note</h3>
      <NoteComposer :lead-id="leadId" @added="notes.refetch(); timeline.refetch()" />
    </section>

    <section class="space-y-2">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">Schedule follow-up</h3>
      <MentionComposer :lead-id="leadId" @created="timeline.refetch()" />
    </section>

    <section class="flex min-h-0 flex-1 flex-col">
      <h3 class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <History class="size-3.5" /> Recent activity
      </h3>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <SkeletonList v-if="timeline.isLoading.value" :rows="4" />
        <Timeline v-else :events="events" empty-title="No activity yet" />
      </div>
    </section>
  </div>
</template>
