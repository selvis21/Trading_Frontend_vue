<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useInfiniteScroll } from '@vueuse/core';
import {
  Plus,
  Trash2,
  X,
  History,
  StickyNote,
  Info,
  Users,
  GitBranch,
  Tag as TagIcon,
} from '@lucide/vue';
import { Link } from '@inertiajs/vue3';
import Timeline from '@/components/timeline/Timeline.vue';
import Badge from '@/components/ui/Badge.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Avatar from '@/components/ui/Avatar.vue';
import Button from '@/components/ui/Button.vue';
import Spinner from '@/components/ui/Spinner.vue';
import LeadStatusPill from './LeadStatusPill.vue';
import NoteComposer from './NoteComposer.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { cn, timeAgo } from '@/lib/utils';
import {
  useLead,
  useLeadNotes,
  useLeadTimeline,
  useLeadTrackHistory,
  useDeleteNote,
  useAttachTag,
  useDetachTag,
} from '@/queries/leads';
import { useLeadStatuses, useTags } from '@/queries/salesReference';
import { useAccumulatedRows } from '@/composables/useAccumulatedRows';
import type { LeadActivity } from '@/types/sales';
import type { StatusTone, TimelineEvent } from '@/types';

const props = defineProps<{ leadId: number; compact?: boolean }>();

const lead = useLead(() => props.leadId);
const statuses = useLeadStatuses();

type TabKey = 'overview' | 'notes' | 'timeline' | 'assignments' | 'status' | 'tags';
const tab = ref<TabKey>('overview');
const tabs: { key: TabKey; label: string; icon: typeof Info }[] = [
  { key: 'overview', label: 'Overview', icon: Info },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'timeline', label: 'Timeline', icon: History },
  { key: 'assignments', label: 'Assignments', icon: Users },
  { key: 'status', label: 'Status', icon: GitBranch },
  { key: 'tags', label: 'Tags', icon: TagIcon },
];

/* ---- notes ---- */
const notes = useLeadNotes(() => props.leadId);
const deleteNote = useDeleteNote();

/* ---- track history ---- */
const trackHistory = useLeadTrackHistory(() => props.leadId);

/* ---- timeline (infinite) ----
 * Page accumulation is delegated to the shared composable so the feed is
 * correctly seeded when the panel mounts/re-mounts while the query cache is
 * still fresh (see useAccumulatedRows for the root-cause note). */
const timelinePage = ref(1);
const timeline = useLeadTimeline(() => props.leadId, timelinePage);
const allActivities = useAccumulatedRows<LeadActivity>(
  () => props.leadId,
  timelinePage,
  () => timeline.data.value,
);
const timelineLastPage = computed(() => timeline.data.value?.last_page ?? 1);
const scroller = useTemplateRef<HTMLElement>('scroller');
useInfiniteScroll(
  scroller,
  () => {
    if (timelinePage.value < timelineLastPage.value && !timeline.isFetching.value) {
      timelinePage.value += 1;
    }
  },
  { distance: 60 },
);

const ACTIVITY_TONE: Record<string, StatusTone> = {
  created: 'info',
  status_changed: 'info',
  assigned: 'accent',
  reassigned: 'accent',
  released: 'warning',
  converted: 'success',
  recovered: 'success',
  abandoned: 'danger',
  blacklisted: 'danger',
  unblacklisted: 'neutral',
  note_added: 'neutral',
  followup_scheduled: 'warning',
};
const timelineEvents = computed<TimelineEvent[]>(() =>
  allActivities.value.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.type.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: a.description ?? undefined,
    tone: ACTIVITY_TONE[a.type] ?? 'neutral',
    at: a.created_at ?? '',
    actor: a.user_id ? { name: `User #${a.user_id}` } : undefined,
  })),
);

const assignmentEvents = computed(() =>
  allActivities.value.filter((a) =>
    ['assigned', 'reassigned', 'released'].includes(a.type),
  ),
);

/* ---- tags ---- */
const tags = useTags();
const attachTag = useAttachTag();
const detachTag = useDetachTag();
const leadTagIds = computed(() => new Set((lead.data.value?.tags ?? []).map((t) => t.id)));
const availableTags = computed(() =>
  (tags.data.value ?? []).filter((t) => !leadTagIds.value.has(t.id)),
);
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- tab bar -->
    <nav
      class="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-1"
      role="tablist"
    >
      <button
        v-for="t in tabs"
        :key="t.key"
        role="tab"
        :aria-selected="tab === t.key"
        :class="
          cn(
            'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            tab === t.key
              ? 'border-primary text-fg'
              : 'border-transparent text-muted hover:text-fg',
          )
        "
        @click="tab = t.key"
      >
        <component :is="t.icon" class="size-4" />
        {{ t.label }}
      </button>
    </nav>

    <div class="min-h-0 flex-1 overflow-y-auto p-4">
      <SkeletonList v-if="lead.isLoading.value" :rows="4" />

      <template v-else-if="lead.data.value">
        <!-- OVERVIEW -->
        <dl v-if="tab === 'overview'" class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div class="col-span-2 flex items-center gap-3">
            <Avatar :name="lead.data.value.name" size="lg" />
            <div>
              <p class="text-base font-semibold text-fg">{{ lead.data.value.name }}</p>
              <LeadStatusPill
                :status-id="lead.data.value.status_id"
                :statuses="statuses.byId.value"
                :fallback="lead.data.value.status?.name"
              />
            </div>
          </div>
          <div><dt class="text-xs text-muted">Email</dt><dd class="text-fg">{{ lead.data.value.email ?? '—' }}</dd></div>
          <div><dt class="text-xs text-muted">Mobile</dt><dd class="text-fg">{{ lead.data.value.mobile ?? '—' }}</dd></div>
          <div><dt class="text-xs text-muted">Type</dt><dd><Badge :tone="lead.data.value.type === 'ib' ? 'accent' : 'neutral'">{{ (lead.data.value.type ?? '—').toUpperCase() }}</Badge></dd></div>
          <div><dt class="text-xs text-muted">Owner</dt><dd class="text-fg">{{ lead.data.value.owner?.name ?? 'Unassigned' }}</dd></div>
          <div><dt class="text-xs text-muted">Source</dt><dd class="text-fg">{{ lead.data.value.campaign_source?.name ?? lead.data.value.campaign_name ?? lead.data.value.site_source ?? '—' }}</dd></div>
          <div><dt class="text-xs text-muted">Reassigned</dt><dd class="text-fg tabular-nums">{{ lead.data.value.reassign_count }}×</dd></div>
          <div v-if="lead.data.value.application" class="col-span-2">
            <dt class="text-xs text-muted">Application</dt>
            <dd class="mt-1 flex items-center gap-2">
              <Link
                :href="`/trading/applications/${lead.data.value.application.reference}`"
                class="font-mono text-xs text-primary hover:underline"
              >
                {{ lead.data.value.application.reference }}
              </Link>
              <StatusBadge :status="lead.data.value.application.status" />
            </dd>
          </div>
          <div v-if="lead.data.value.is_converted" class="col-span-2">
            <Badge tone="success">Converted{{ lead.data.value.client?.client_code ? ` · ${lead.data.value.client.client_code}` : '' }}</Badge>
          </div>
          <div v-if="lead.data.value.note" class="col-span-2">
            <dt class="text-xs text-muted">Note</dt>
            <dd class="whitespace-pre-wrap text-fg">{{ lead.data.value.note }}</dd>
          </div>
        </dl>

        <!-- NOTES -->
        <div v-else-if="tab === 'notes'" class="space-y-3">
          <NoteComposer :lead-id="leadId" @added="notes.refetch()" />
          <SkeletonList v-if="notes.isLoading.value" :rows="3" />
          <EmptyState
            v-else-if="!notes.data.value?.length"
            :icon="StickyNote"
            title="No notes yet"
            class="border-0"
          />
          <ul v-else class="space-y-2">
            <li
              v-for="n in notes.data.value"
              :key="n.id"
              class="group rounded-lg border border-border bg-surface p-3"
            >
              <p class="whitespace-pre-wrap text-sm text-fg">{{ n.body }}</p>
              <div class="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{{ timeAgo(n.created_at) }}</span>
                <button
                  class="opacity-0 transition-opacity group-hover:opacity-100"
                  @click="deleteNote.mutate({ id: leadId, noteId: n.id }, { onSuccess: () => notes.refetch() })"
                >
                  <Trash2 class="size-3.5 hover:text-status-danger" />
                </button>
              </div>
            </li>
          </ul>
        </div>

        <!-- TIMELINE -->
        <div v-else-if="tab === 'timeline'" ref="scroller" class="max-h-[60vh] overflow-y-auto">
          <SkeletonList v-if="timeline.isLoading.value && !timelineEvents.length" :rows="5" />
          <Timeline v-else :events="timelineEvents" empty-title="No activity yet" />
          <div v-if="timeline.isFetching.value && timelineEvents.length" class="flex justify-center py-3">
            <Spinner />
          </div>
        </div>

        <!-- ASSIGNMENTS -->
        <div v-else-if="tab === 'assignments'" class="space-y-3">
          <div class="rounded-lg border border-border bg-surface p-3 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-muted">Current owner</span>
              <span class="font-medium text-fg">{{ lead.data.value.owner?.name ?? 'Unassigned' }}</span>
            </div>
            <div class="mt-1 flex items-center justify-between">
              <span class="text-muted">Reassignments</span>
              <span class="tabular-nums text-fg">{{ lead.data.value.reassign_count }}</span>
            </div>
            <div v-if="lead.data.value.assigned_at" class="mt-1 flex items-center justify-between">
              <span class="text-muted">Assigned</span>
              <span class="text-fg">{{ timeAgo(lead.data.value.assigned_at) }}</span>
            </div>
          </div>
          <EmptyState
            v-if="!assignmentEvents.length"
            :icon="Users"
            title="No assignment history"
            description="Assignment events will appear here."
            class="border-0"
          />
          <ul v-else class="space-y-2">
            <li
              v-for="a in assignmentEvents"
              :key="a.id"
              class="flex items-center gap-2 rounded-lg border border-border bg-surface p-2.5 text-sm"
            >
              <Badge tone="accent">{{ a.type }}</Badge>
              <span class="flex-1 truncate text-fg">{{ a.description ?? '—' }}</span>
              <span class="text-xs text-muted">{{ timeAgo(a.created_at) }}</span>
            </li>
          </ul>
        </div>

        <!-- STATUS HISTORY -->
        <div v-else-if="tab === 'status'">
          <SkeletonList v-if="trackHistory.isLoading.value" :rows="3" />
          <EmptyState
            v-else-if="!trackHistory.data.value?.length"
            :icon="GitBranch"
            title="No status changes"
            class="border-0"
          />
          <ul v-else class="space-y-2">
            <li
              v-for="h in trackHistory.data.value"
              :key="h.id"
              class="rounded-lg border border-border bg-surface p-3"
            >
              <div class="flex items-center justify-between">
                <LeadStatusPill :status-id="h.lead_status_id" :statuses="statuses.byId.value" />
                <span class="text-xs text-muted">{{ timeAgo(h.created_at) }}</span>
              </div>
              <p v-if="h.comment" class="mt-1.5 text-sm text-fg">{{ h.comment }}</p>
              <p v-if="h.call_again_at" class="mt-1 text-xs text-status-warning">
                Call back: {{ new Date(h.call_again_at).toLocaleDateString() }}
              </p>
            </li>
          </ul>
        </div>

        <!-- TAGS -->
        <div v-else-if="tab === 'tags'" class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <span
              v-for="t in lead.data.value.tags ?? []"
              :key="t.id"
              class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
              :style="{ color: t.color ?? undefined, borderColor: t.color ? `${t.color}55` : undefined }"
            >
              {{ t.name }}
              <button
                aria-label="Remove tag"
                @click="detachTag.mutate({ id: leadId, tagId: t.id })"
              >
                <X class="size-3 hover:text-status-danger" />
              </button>
            </span>
            <span v-if="!(lead.data.value.tags ?? []).length" class="text-sm text-muted">
              No tags attached.
            </span>
          </div>
          <div>
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Add a tag</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="t in availableTags"
                :key="t.id"
                class="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted transition-colors hover:border-primary/40 hover:text-fg"
                @click="attachTag.mutate({ id: leadId, tagId: t.id })"
              >
                <Plus class="size-3" /> {{ t.name }}
              </button>
              <span v-if="!availableTags.length" class="text-xs text-muted">
                All tags attached.
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
