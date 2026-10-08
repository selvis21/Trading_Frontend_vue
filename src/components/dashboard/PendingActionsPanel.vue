<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ChevronRight, ListTodo } from '@lucide/vue';
import WidgetCard from './WidgetCard.vue';
import { usePendingActions } from '@/queries/dashboard';

/* Operations Center — workflow queue sizes the user can act on. Each row
 * deep-links into the relevant queue. Background-refreshed. */
const q = usePendingActions();
</script>

<template>
  <WidgetCard
    title="Pending actions"
    subtitle="Queues awaiting you"
    :icon="ListTodo"
    :loading="q.isLoading.value"
    :error="q.isError.value"
    :empty="q.isSuccess.value && !q.data.value?.length"
    empty-text="You're all caught up"
    skeleton="lines"
    @retry="q.refetch()"
  >
    <ul class="-my-1 divide-y divide-border">
      <li v-for="action in q.data.value" :key="action.key">
        <component
          :is="action.link ? Link : 'div'"
          :href="action.link ?? undefined"
          class="group flex items-center gap-3 py-2.5"
          :class="action.link && 'cursor-pointer'"
        >
          <span
            class="flex size-7 shrink-0 items-center justify-center rounded-md bg-status-warning/10 text-xs font-semibold tabular-nums text-status-warning"
          >
            {{ action.count }}
          </span>
          <span class="min-w-0 flex-1 truncate text-sm text-fg">
            {{ action.label }}
          </span>
          <ChevronRight
            v-if="action.link"
            class="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
          />
        </component>
      </li>
    </ul>
  </WidgetCard>
</template>
