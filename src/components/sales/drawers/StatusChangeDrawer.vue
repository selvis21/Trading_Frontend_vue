<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Drawer from '@/components/ui/Drawer.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import LeadStatusPill from '@/components/sales/LeadStatusPill.vue';
import { cn } from '@/lib/utils';
import { useLeadStatuses } from '@/queries/salesReference';
import { api } from '@/services/api';
import { useTrackLead } from '@/queries/leads';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import { isApiError } from '@/services/api';
import type { LeadStatusReason } from '@/types/sales';

/* Track a lead's status. Picking a status that requires a callback forces
 * a future date (which the backend turns into a follow-up mention). */
const props = defineProps<{
  open: boolean;
  leadId: number;
  currentStatusId?: number | null;
}>();
const emit = defineEmits<{ 'update:open': [value: boolean]; tracked: [] }>();

const statuses = useLeadStatuses();
const track = useTrackLead();
const toast = useToast();
const { confirm } = useConfirm();

const statusId = ref<number | null>(null);
const reasonId = ref<number | null>(null);
const comment = ref('');
const callAgainAt = ref('');
const minCallAgainAt = ref('');
const reasons = ref<LeadStatusReason[]>([]);

/* `call_again_at` is a datetime — a date-only value parses to midnight, which
 * the backend rejects as past for same-day callbacks. Use datetime-local and
 * block past selection via a `min` of the current minute. */
function nowForInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const selectedStatus = computed(() =>
  statusId.value ? statuses.byId.value.get(statusId.value) : undefined,
);
const requiresCallback = computed(
  () => selectedStatus.value?.requires_callback ?? false,
);

/* Moving to an earlier pipeline stage (lower sort_order) is a backward step the
 * backend guards (code 30001). Confirm intent client-side first; the backend
 * still has the final say on permission. */
const isBackwardStep = computed(() => {
  const current = props.currentStatusId
    ? statuses.byId.value.get(props.currentStatusId)
    : undefined;
  const target = selectedStatus.value;
  return (
    !!current &&
    !!target &&
    target.id !== current.id &&
    target.sort_order < current.sort_order
  );
});

watch(
  () => props.open,
  (o) => {
    if (o) {
      statusId.value = props.currentStatusId ?? null;
      reasonId.value = null;
      comment.value = '';
      callAgainAt.value = '';
      minCallAgainAt.value = nowForInput();
    }
  },
);

// Load sub-reasons for the chosen status.
watch(statusId, async (id) => {
  reasonId.value = null;
  reasons.value = [];
  if (!id) return;
  const inline = statuses.byId.value.get(id)?.reasons;
  if (inline?.length) {
    reasons.value = inline;
    return;
  }
  reasons.value = await api.get<LeadStatusReason[]>('/lead-status-reasons', {
    lead_status_id: id,
  });
});

const valid = computed(
  () => !!statusId.value && (!requiresCallback.value || !!callAgainAt.value),
);

async function submit() {
  if (!valid.value || !statusId.value) return;

  if (isBackwardStep.value) {
    const ok = await confirm({
      title: 'Move to an earlier status?',
      description:
        'This moves the lead back to an earlier pipeline stage. Continue?',
      confirmLabel: 'Move back',
      tone: 'warning',
    });
    if (!ok) return;
  }

  track.mutate(
    {
      id: props.leadId,
      body: {
        status_id: statusId.value,
        reason_id: reasonId.value ?? undefined,
        comment: comment.value || undefined,
        call_again_at: callAgainAt.value || undefined,
      },
    },
    {
      onSuccess: () => {
        toast.success('Status updated');
        emit('tracked');
        emit('update:open', false);
      },
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}
</script>

<template>
  <Drawer
    :open="open"
    title="Change status"
    description="Advance the lead through the pipeline."
    width="28rem"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5">
      <!-- pipeline picker -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-fg">Status</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="s in statuses.data.value"
            :key="s.id"
            :class="
              cn(
                'rounded-md border px-1 py-0.5 transition-all',
                statusId === s.id
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-transparent opacity-80 hover:opacity-100',
              )
            "
            @click="statusId = s.id"
          >
            <LeadStatusPill :status-id="s.id" :statuses="statuses.byId.value" />
          </button>
        </div>
      </div>

      <!-- reason -->
      <div v-if="reasons.length" class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Reason</label>
        <select
          :value="reasonId ?? ''"
          class="h-9 w-full rounded-md border border-input bg-surface px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @change="reasonId = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null"
        >
          <option value="">— Select reason —</option>
          <option v-for="r in reasons" :key="r.id" :value="r.id">
            {{ r.name }}
          </option>
        </select>
      </div>

      <!-- callback (required by some statuses) -->
      <div v-if="requiresCallback" class="space-y-1.5">
        <label class="text-sm font-medium text-fg">
          Call back on <span class="text-status-danger">*</span>
        </label>
        <Input v-model="callAgainAt" type="datetime-local" :min="minCallAgainAt" />
        <p class="text-xs text-muted">
          This schedules a follow-up reminder for you. Must be in the future.
        </p>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Comment (optional)</label>
        <textarea
          v-model="comment"
          rows="3"
          maxlength="2000"
          placeholder="What happened on this touch?"
          class="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="!valid" :loading="track.isPending.value" @click="submit">
          Save status
        </Button>
      </div>
    </template>
  </Drawer>
</template>
