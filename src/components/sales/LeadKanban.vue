<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { GripVertical, Ban, CheckCircle2 } from '@lucide/vue';
import Avatar from '@/components/ui/Avatar.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { cn, timeAgo } from '@/lib/utils';
import { useLeadStatuses } from '@/queries/salesReference';
import { toneForLeadStatus, toneDotClass } from '@/composables/useStatusTone';
import type { Lead } from '@/types/sales';

/* Lead pipeline board. Columns are the lead statuses (ordered); cards are
 * the current page of leads grouped by status. Dragging a card emits a
 * `move` (the page handles the track + callback rules) and optimistically
 * relocates the card so the interaction feels instant. */
const props = defineProps<{
  leads: Lead[];
  loading?: boolean;
}>();
const emit = defineEmits<{
  move: [payload: { leadId: number; statusId: number }];
  open: [lead: Lead];
}>();

const statuses = useLeadStatuses();

// Local copy so optimistic drag moves render immediately.
const local = ref<Lead[]>([]);
watch(
  () => props.leads,
  (v) => (local.value = [...v]),
  { immediate: true },
);

const columns = computed(() =>
  (statuses.data.value ?? []).map((s) => ({
    status: s,
    leads: local.value.filter((l) => l.status_id === s.id),
  })),
);

const dragId = ref<number | null>(null);
const overStatus = ref<number | null>(null);

function onDrop(statusId: number) {
  const id = dragId.value;
  overStatus.value = null;
  dragId.value = null;
  if (id == null) return;
  const lead = local.value.find((l) => l.id === id);
  if (!lead || lead.status_id === statusId) return;
  lead.status_id = statusId; // optimistic
  emit('move', { leadId: id, statusId });
}
</script>

<template>
  <div class="overflow-x-auto pb-2">
    <div class="flex min-h-[24rem] gap-3">
      <div
        v-for="col in columns"
        :key="col.status.id"
        :class="
          cn(
            'flex w-72 shrink-0 flex-col rounded-lg border border-border bg-surface-sunken transition-colors',
            overStatus === col.status.id && 'ring-2 ring-primary',
          )
        "
        @dragover.prevent="overStatus = col.status.id"
        @dragleave="overStatus = null"
        @drop="onDrop(col.status.id)"
      >
        <header
          class="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5"
        >
          <div class="flex items-center gap-2">
            <!-- Same central tone mapping as LeadStatusPill, so a column
                 header and the badges inside it never disagree. -->
            <span
              class="size-2.5 rounded-full"
              :class="toneDotClass(toneForLeadStatus(col.status))"
            />
            <span class="text-sm font-semibold text-fg">{{ col.status.name }}</span>
          </div>
          <span class="rounded bg-muted-surface px-1.5 text-xs tabular-nums text-muted">
            {{ col.leads.length }}
          </span>
        </header>

        <div class="flex-1 space-y-2 overflow-y-auto p-2">
          <template v-if="loading">
            <Skeleton v-for="i in 3" :key="i" class="h-20" />
          </template>
          <template v-else>
            <article
              v-for="lead in col.leads"
              :key="lead.id"
              draggable="true"
              class="group cursor-pointer rounded-md border border-border bg-surface p-2.5 shadow-xs transition-shadow hover:shadow-sm"
              @dragstart="dragId = lead.id"
              @click="emit('open', lead)"
            >
              <div class="flex items-start gap-2">
                <Avatar :name="lead.name" size="sm" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1 text-sm font-medium text-fg">
                    <span class="truncate">{{ lead.name }}</span>
                    <Ban v-if="lead.is_blacklisted" class="size-3 text-status-danger" />
                    <CheckCircle2 v-if="lead.is_converted" class="size-3 text-status-success" />
                  </div>
                  <p class="truncate text-xs text-muted">
                    {{ lead.email || lead.mobile || '—' }}
                  </p>
                </div>
                <GripVertical
                  class="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <div class="mt-2 flex items-center justify-between text-[11px] text-muted">
                <span v-if="lead.owner" class="truncate">{{ lead.owner.name }}</span>
                <span v-else>Unassigned</span>
                <span v-if="lead.last_tracked_at">{{ timeAgo(lead.last_tracked_at) }}</span>
              </div>
            </article>

            <p
              v-if="!col.leads.length"
              class="px-1 py-6 text-center text-xs text-muted"
            >
              Drop leads here
            </p>
          </template>
        </div>
      </div>

      <EmptyState
        v-if="!columns.length && !loading"
        title="No pipeline statuses"
        class="m-auto"
      />
    </div>
  </div>
</template>
