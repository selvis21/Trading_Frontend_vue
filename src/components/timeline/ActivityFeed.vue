<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Link } from '@inertiajs/vue3';
import Avatar from '@/components/ui/Avatar.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { Activity } from '@lucide/vue';
import { cn, timeAgo } from '@/lib/utils';
import type { TimelineEvent } from '@/types';

/* Compact, cross-entity activity stream (ambient). Realtime-ready: when
 * new events are prepended, a "N new" pill appears instead of yanking
 * scroll — the user opts in to reveal. */
const props = defineProps<{ events: TimelineEvent[] }>();

const revealed = ref(0);
const pending = ref(0);
let known = props.events.length;

watch(
  () => props.events.length,
  (len) => {
    if (len > known) pending.value += len - known;
    known = len;
  },
);

const visible = computed(() => props.events);
function reveal() {
  revealed.value += pending.value;
  pending.value = 0;
}

const toneText: Record<string, string> = {
  neutral: 'text-status-neutral',
  info: 'text-status-info',
  warning: 'text-status-warning',
  success: 'text-status-success',
  danger: 'text-status-danger',
  accent: 'text-status-accent',
};
</script>

<template>
  <div class="relative">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="-translate-y-1 opacity-0"
    >
      <button
        v-if="pending > 0"
        class="absolute inset-x-0 top-0 z-10 mx-auto flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-primary shadow-md"
        @click="reveal"
      >
        <span class="size-1.5 animate-pulse rounded-full bg-primary" />
        {{ pending }} new
      </button>
    </Transition>

    <EmptyState
      v-if="!visible.length"
      :icon="Activity"
      title="No recent activity"
    />
    <ul v-else class="divide-y divide-border">
      <li
        v-for="event in visible"
        :key="event.id"
        class="flex items-start gap-3 py-2.5"
      >
        <Avatar
          v-if="event.actor"
          :name="event.actor.name"
          :src="event.actor.avatar"
          size="sm"
        />
        <span
          v-else
          :class="
            cn('mt-1 size-2 shrink-0 rounded-full bg-current', toneText[event.tone ?? 'neutral'])
          "
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm text-fg">
            <span class="font-medium">{{ event.title }}</span>
            <span v-if="event.description" class="text-muted">
              · {{ event.description }}</span
            >
          </p>
          <p class="mt-0.5 text-xs text-muted">{{ timeAgo(event.at) }}</p>
        </div>
        <Link
          v-if="(event as any).href"
          :href="(event as any).href"
          class="text-xs font-medium text-primary hover:underline"
        >
          View
        </Link>
      </li>
    </ul>
  </div>
</template>
