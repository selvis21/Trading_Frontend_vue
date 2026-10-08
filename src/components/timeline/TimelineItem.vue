<script setup lang="ts">
import { computed } from 'vue';
import { cn, timeAgo } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar.vue';
import type { TimelineEvent } from '@/types';

const props = defineProps<{ event: TimelineEvent; last?: boolean }>();

const toneDot: Record<string, string> = {
  neutral: 'bg-status-neutral',
  info: 'bg-status-info',
  warning: 'bg-status-warning',
  success: 'bg-status-success',
  danger: 'bg-status-danger',
  accent: 'bg-status-accent',
};
const dotClass = computed(() => toneDot[props.event.tone ?? 'neutral']);
</script>

<template>
  <li class="relative flex gap-3 ps-1">
    <!-- rail -->
    <div class="flex flex-col items-center">
      <span
        :class="
          cn('mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-bg', dotClass)
        "
      />
      <span v-if="!last" class="w-px flex-1 bg-border" />
    </div>

    <div class="-mt-0.5 flex-1 pb-5">
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-medium text-fg">{{ event.title }}</p>
        <time
          class="shrink-0 text-xs text-muted"
          :datetime="event.at"
          :title="event.at"
        >
          {{ timeAgo(event.at) }}
        </time>
      </div>
      <p v-if="event.description" class="mt-0.5 text-sm text-muted">
        {{ event.description }}
      </p>
      <div
        v-if="event.actor"
        class="mt-1.5 flex items-center gap-1.5 text-xs text-muted"
      >
        <Avatar :name="event.actor.name" :src="event.actor.avatar" size="xs" />
        {{ event.actor.name }}
      </div>
    </div>
  </li>
</template>
