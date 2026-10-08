<script setup lang="ts">
import { computed, ref, useTemplateRef, type Component } from 'vue';
import { useInfiniteScroll } from '@vueuse/core';
import { Activity, Users, ShieldCheck, LineChart, Wallet } from '@lucide/vue';
import WidgetCard from './WidgetCard.vue';
import Drawer from '@/components/ui/Drawer.vue';
import Avatar from '@/components/ui/Avatar.vue';
import Badge from '@/components/ui/Badge.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { cn, timeAgo } from '@/lib/utils';
import { useActivityFeed } from '@/queries/dashboard';
import type { ActivityItem } from '@/types/dashboard';
import type { StatusTone } from '@/types';

/* Unified, cross-domain activity stream. Client-side domain filters, an
 * IntersectionObserver-driven "load more" (the API exposes only a limit,
 * so we grow it), and a drawer drill-down for each event. */
const PAGE = 25;
const MAX = 200;
const limit = ref(PAGE);
const q = useActivityFeed(limit);

const scroller = useTemplateRef<HTMLElement>('scroller');
useInfiniteScroll(
  scroller,
  () => {
    if (limit.value < MAX && (q.data.value?.length ?? 0) >= limit.value) {
      limit.value = Math.min(MAX, limit.value + PAGE);
    }
  },
  { distance: 80, canLoadMore: () => !q.isFetching.value },
);

const domains: { key: string; label: string; icon: Component }[] = [
  { key: 'all', label: 'All', icon: Activity },
  { key: 'sales', label: 'Sales', icon: Users },
  { key: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { key: 'trading', label: 'Trading', icon: LineChart },
  { key: 'finance', label: 'Finance', icon: Wallet },
];
const activeDomain = ref('all');

const domainTone: Record<string, StatusTone> = {
  sales: 'info',
  compliance: 'accent',
  trading: 'success',
  finance: 'warning',
};
// Static classes so Tailwind's JIT keeps them (no dynamic interpolation).
const dotClass: Record<string, string> = {
  sales: 'text-status-info',
  compliance: 'text-status-accent',
  trading: 'text-status-success',
  finance: 'text-status-warning',
  default: 'text-status-neutral',
};

const items = computed(() => {
  const all = q.data.value ?? [];
  return activeDomain.value === 'all'
    ? all
    : all.filter((i) => i.domain === activeDomain.value);
});

function humanize(type: string): string {
  return type.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const selected = ref<ActivityItem | null>(null);
const drawerOpen = ref(false);
function openDetail(item: ActivityItem) {
  selected.value = item;
  drawerOpen.value = true;
}
</script>

<template>
  <WidgetCard
    title="Activity"
    subtitle="Across every domain you can see"
    :icon="Activity"
    :loading="q.isLoading.value"
    :error="q.isError.value"
    :empty="q.isSuccess.value && !items.length"
    empty-text="No recent activity"
    skeleton="lines"
    @retry="q.refetch()"
  >
    <template #action>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="d in domains"
          :key="d.key"
          :class="
            cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
              activeDomain === d.key
                ? 'bg-primary/10 text-primary'
                : 'text-muted hover:bg-muted-surface hover:text-fg',
            )
          "
          @click="activeDomain = d.key"
        >
          <component :is="d.icon" class="size-3.5" />
          <span class="hidden sm:inline">{{ d.label }}</span>
        </button>
      </div>
    </template>

    <div ref="scroller" class="max-h-[26rem] overflow-y-auto">
      <ul class="divide-y divide-border">
        <li v-for="(item, i) in items" :key="`${item.occurred_at}-${i}`">
          <button
            class="flex w-full items-start gap-3 py-2.5 text-start transition-colors hover:bg-muted-surface/50"
            @click="openDetail(item)"
          >
            <Avatar
              v-if="item.user_id"
              :name="`U${item.user_id}`"
              size="sm"
            />
            <span
              v-else
              class="mt-1 size-2 shrink-0 rounded-full bg-current"
              :class="dotClass[item.domain] ?? dotClass.default"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-fg">
                <span class="font-medium">{{ humanize(item.type) }}</span>
                <span v-if="item.description" class="text-muted">
                  · {{ item.description }}</span
                >
              </p>
              <p class="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <Badge :tone="domainTone[item.domain] ?? 'neutral'">
                  {{ item.domain }}
                </Badge>
                {{ timeAgo(item.occurred_at) }}
              </p>
            </div>
          </button>
        </li>
      </ul>

      <div
        v-if="q.isFetching.value && items.length"
        class="flex justify-center py-3"
      >
        <Spinner />
      </div>
      <p
        v-else-if="limit >= MAX"
        class="py-3 text-center text-xs text-muted"
      >
        Showing the most recent {{ MAX }} events.
      </p>
    </div>
  </WidgetCard>

  <!-- drill-down -->
  <Drawer v-model:open="drawerOpen" title="Activity detail">
    <dl v-if="selected" class="space-y-3 text-sm">
      <div>
        <dt class="text-xs uppercase tracking-wide text-muted">Event</dt>
        <dd class="mt-0.5 font-medium text-fg">{{ humanize(selected.type) }}</dd>
      </div>
      <div v-if="selected.description">
        <dt class="text-xs uppercase tracking-wide text-muted">Description</dt>
        <dd class="mt-0.5 text-fg">{{ selected.description }}</dd>
      </div>
      <div>
        <dt class="text-xs uppercase tracking-wide text-muted">Domain</dt>
        <dd class="mt-0.5">
          <Badge :tone="domainTone[selected.domain] ?? 'neutral'">{{
            selected.domain
          }}</Badge>
        </dd>
      </div>
      <div>
        <dt class="text-xs uppercase tracking-wide text-muted">When</dt>
        <dd class="mt-0.5 text-fg">
          {{ new Date(selected.occurred_at).toLocaleString() }}
          <span class="text-muted">({{ timeAgo(selected.occurred_at) }})</span>
        </dd>
      </div>
      <div v-if="selected.client_id" class="font-mono text-xs text-muted">
        client #{{ selected.client_id }} · actor #{{ selected.user_id ?? '—' }}
      </div>
    </dl>
  </Drawer>
</template>
