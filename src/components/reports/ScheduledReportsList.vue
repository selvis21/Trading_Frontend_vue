<script setup lang="ts">
import { CalendarClock, Pencil, Trash2, Users } from '@lucide/vue';
import { router } from '@inertiajs/vue3';
import Badge from '@/components/ui/Badge.vue';
import Switch from '@/components/ui/Switch.vue';
import Button from '@/components/ui/Button.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { timeAgo } from '@/lib/utils';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import {
  useScheduledReports,
  useUpdateSchedule,
  useDeleteSchedule,
} from '@/queries/reports';
import type { ScheduledReport } from '@/types/reports';

/* Scheduled-report list with inline enable/disable (PATCH is_active), edit
 * and delete. */
const emit = defineEmits<{ edit: [schedule: ScheduledReport] }>();

const toast = useToast();
const { confirm } = useConfirm();
const list = useScheduledReports();
const update = useUpdateSchedule();
const remove = useDeleteSchedule();

function toggle(s: ScheduledReport, value: boolean) {
  update.mutate(
    { id: s.id, payload: { is_active: value } },
    {
      onSuccess: () => toast.success(value ? 'Schedule enabled' : 'Schedule disabled'),
      onError: (e) => toast.fromError(e),
    },
  );
}

async function del(s: ScheduledReport) {
  const ok = await confirm({
    title: 'Delete schedule?',
    description: `"${s.name}" will be removed. This cannot be undone.`,
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  remove.mutate(
    { id: s.id },
    {
      onSuccess: () => toast.success('Schedule deleted'),
      onError: (e) => toast.fromError(e),
    },
  );
}
</script>

<template>
  <div>
    <SkeletonList v-if="list.isLoading.value" :rows="3" />
    <EmptyState
      v-else-if="!list.data.value?.length"
      :icon="CalendarClock"
      title="No scheduled reports"
      description="Create a schedule to deliver a report on a recurring cadence."
      class="border-0"
    />
    <ul v-else class="space-y-2">
      <li
        v-for="s in list.data.value"
        :key="s.id"
        class="rounded-lg border border-border bg-surface p-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <p class="truncate text-sm font-medium text-fg">{{ s.name }}</p>
              <Badge tone="neutral" class="capitalize">{{ s.frequency }}</Badge>
              <Badge tone="neutral">{{ s.format.toUpperCase() }}</Badge>
            </div>
            <p class="mt-0.5 font-mono text-xs text-muted" dir="ltr">{{ s.report_key }}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span class="inline-flex items-center gap-1"><Users class="size-3" /> {{ s.recipients.length }} recipient(s)</span>
              <span v-if="s.next_run_at">Next {{ timeAgo(s.next_run_at) }}</span>
              <span v-if="s.last_run_at">Last {{ timeAgo(s.last_run_at) }}</span>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <Switch
              :model-value="s.is_active"
              :aria-label="s.is_active ? 'Disable' : 'Enable'"
              @update:model-value="toggle(s, $event)"
            />
            <Button size="icon-sm" variant="ghost" aria-label="View report" @click="router.visit(`/reports/view/${s.report_key}`)">
              <CalendarClock class="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Edit" @click="emit('edit', s)">
              <Pencil class="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Delete" @click="del(s)">
              <Trash2 class="size-4" />
            </Button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
