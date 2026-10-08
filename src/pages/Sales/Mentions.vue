<script setup lang="ts">
import { computed, ref } from 'vue';
import { Link } from '@inertiajs/vue3';
import {
  Bell,
  Check,
  RotateCcw,
  Trash2,
  ExternalLink,
  AtSign,
  CalendarClock,
} from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import Switch from '@/components/ui/Switch.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { cn, timeAgo } from '@/lib/utils';
import {
  useMentions,
  useMentionAction,
  useDeleteMention,
} from '@/queries/mentions';

defineOptions({ layout: null });

/* Follow-up queue — the user's mentions/reminders inbox. Overdue items
 * surface first; processing clears them. */
const includeProcessed = ref(false);
const list = useMentions(includeProcessed);
const action = useMentionAction();
const del = useDeleteMention();

const now = Date.now();
const sorted = computed(() =>
  [...(list.data.value ?? [])].sort((a, b) => {
    const ta = a.remind_at ? new Date(a.remind_at).getTime() : Infinity;
    const tb = b.remind_at ? new Date(b.remind_at).getTime() : Infinity;
    return ta - tb;
  }),
);
function isOverdue(remindAt: string | null): boolean {
  return !!remindAt && new Date(remindAt).getTime() < now;
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <header class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <Bell class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Follow-ups</h1>
            <p class="text-sm text-muted">Your reminders and mentions.</p>
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-muted">
          <Switch v-model="includeProcessed" aria-label="Show processed" />
          Show processed
        </label>
      </header>

      <SkeletonList v-if="list.isLoading.value" :rows="5" />

      <EmptyState
        v-else-if="!sorted.length"
        :icon="Bell"
        title="You're all caught up"
        description="Scheduled follow-ups and mentions will appear here."
      />

      <ul v-else class="space-y-2">
        <li
          v-for="m in sorted"
          :key="m.id"
          :class="
            cn(
              'flex items-start gap-3 rounded-lg border bg-surface p-3 transition-colors',
              m.is_processed
                ? 'border-border opacity-60'
                : isOverdue(m.remind_at)
                  ? 'border-status-warning/40'
                  : 'border-border',
            )
          "
        >
          <span
            class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md"
            :class="m.type === 'followup' ? 'bg-status-warning/10 text-status-warning' : 'bg-status-info/10 text-status-info'"
          >
            <CalendarClock v-if="m.type === 'followup'" class="size-4" />
            <AtSign v-else class="size-4" />
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="truncate text-sm font-medium text-fg">{{ m.title }}</p>
              <Badge v-if="isOverdue(m.remind_at) && !m.is_processed" tone="warning">Overdue</Badge>
              <Badge v-if="m.is_processed" tone="success">Done</Badge>
            </div>
            <p class="mt-0.5 text-xs text-muted">
              <span v-if="m.remind_at">{{ timeAgo(m.remind_at) }}</span>
              <span v-else>No date</span>
              <Link
                v-if="m.lead_id"
                :href="`/leads/${m.lead_id}`"
                class="ms-2 inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                <ExternalLink class="size-3" /> Lead #{{ m.lead_id }}
              </Link>
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <Button
              v-if="!m.is_processed"
              size="icon-sm"
              variant="ghost"
              aria-label="Mark done"
              @click="action.mutate({ id: m.id, action: 'processed' })"
            >
              <Check class="size-4 text-status-success" />
            </Button>
            <Button
              v-else
              size="icon-sm"
              variant="ghost"
              aria-label="Reopen"
              @click="action.mutate({ id: m.id, action: 'unprocessed' })"
            >
              <RotateCcw class="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Delete"
              @click="del.mutate(m.id)"
            >
              <Trash2 class="size-4 text-muted hover:text-status-danger" />
            </Button>
          </div>
        </li>
      </ul>
    </div>
  </AppLayout>
</template>
