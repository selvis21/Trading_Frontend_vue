<script setup lang="ts">
import { computed } from 'vue';
import TimelineItem from './TimelineItem.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { History } from '@lucide/vue';
import type { TimelineEvent } from '@/types';

/* Vertical, per-entity event history (audit-grade). Groups by calendar
 * day with sticky day headers. */
const props = defineProps<{
  events: TimelineEvent[];
  emptyTitle?: string;
}>();

const groups = computed(() => {
  const map = new Map<string, TimelineEvent[]>();
  for (const e of props.events) {
    const day = new Date(e.at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    (map.get(day) ?? map.set(day, []).get(day)!).push(e);
  }
  return [...map.entries()];
});
</script>

<template>
  <EmptyState
    v-if="!events.length"
    :icon="History"
    :title="emptyTitle ?? 'No activity yet'"
    description="Events for this record will appear here as they happen."
  />
  <div v-else class="space-y-4">
    <section v-for="[day, items] in groups" :key="day">
      <h4
        class="sticky top-0 z-[1] -mx-1 mb-2 bg-bg/80 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted backdrop-blur"
      >
        {{ day }}
      </h4>
      <ul>
        <TimelineItem
          v-for="(event, i) in items"
          :key="event.id"
          :event="event"
          :last="i === items.length - 1"
        />
      </ul>
    </section>
  </div>
</template>
