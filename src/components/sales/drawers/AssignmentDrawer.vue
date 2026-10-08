<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Drawer from '@/components/ui/Drawer.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import UserPicker from '@/components/sales/UserPicker.vue';
import { useAssignLead, useBulkAssign } from '@/queries/leads';
import { useAssignableUsers } from '@/queries/salesReference';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';
import { USER_COLORS } from '@/types/admin';
import { cn } from '@/lib/utils';

/* Assign or reassign one or many leads. When `leadIds` has >1 entry the
 * bulk endpoint is used; otherwise the single-lead endpoint.
 *
 * Owner colour: the backend (LeadAssignmentService) REQUIRES a `color` when the
 * assignee is sales staff (level >= 4 — Sales Manager / Team Leader / Sales
 * Agent) and stores it on `lead.owner_color`. We surface a colour picker for
 * those assignees, auto-selecting the user's own colour (`user.colors[0]`) when
 * they have one, and offering the shared palette otherwise. Non-sales assignees
 * need no colour and the field stays hidden. */
const props = defineProps<{
  open: boolean;
  leadIds: number[];
  /* Current owner of each selected lead (aligned to `leadIds`, null when
   * unowned). Used to require a reason on reassignment, mirroring the backend
   * LeadAssignmentService rule. */
  ownerIds?: (number | null)[];
}>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  assigned: [];
}>();

const assign = useAssignLead();
const bulk = useBulkAssign();
const toast = useToast();
const users = useAssignableUsers();

const ownerId = ref<number | null>(null);
const reason = ref('');
const color = ref<string | null>(null);

/** Sales staff (Sales Manager L4 → Sales Agent L6) require an owner colour. */
const SALES_STAFF_MIN_LEVEL = 4;
const assignee = computed(
  () => users.data.value?.find((u) => u.id === ownerId.value) ?? null,
);
const requiresColour = computed(
  () => (assignee.value?.level ?? 0) >= SALES_STAFF_MIN_LEVEL,
);

/* The backend requires a reason whenever an already-owned lead is moved to a
 * different owner. Surface that here so the user isn't rejected after submit. */
const isReassign = computed(() =>
  (props.ownerIds ?? []).some(
    (owner) => owner !== null && owner !== ownerId.value,
  ),
);
const requiresReason = computed(
  () => isReassign.value && !reason.value.trim(),
);

/** The assignee's own colour(s) first (the default), then the shared palette. */
const colourOptions = computed(() => {
  const map = new Map<string, string>();
  (assignee.value?.colors ?? []).forEach((c) => map.set(c, c));
  USER_COLORS.forEach((o) => map.set(o.value, o.label));
  return [...map.entries()].map(([value, label]) => ({ value, label }));
});

watch(
  () => props.open,
  (o) => {
    if (o) {
      ownerId.value = null;
      reason.value = '';
      color.value = null;
    }
  },
);

// Auto-select the assignee's default colour when a sales-staff owner is chosen.
watch(ownerId, () => {
  color.value = requiresColour.value
    ? (assignee.value?.colors?.[0] ?? null)
    : null;
});

const pending = () => assign.isPending.value || bulk.isPending.value;
const valid = computed(
  () =>
    !!ownerId.value &&
    (!requiresColour.value || !!color.value) &&
    !requiresReason.value,
);

function submit() {
  if (!valid.value) return;
  const onDone = () => {
    toast.success(
      props.leadIds.length > 1
        ? `${props.leadIds.length} leads assigned`
        : 'Lead assigned',
    );
    emit('assigned');
    emit('update:open', false);
  };
  const onErr = (e: unknown) => isApiError(e) && toast.fromError(e);
  const colour = color.value ?? undefined;

  if (props.leadIds.length > 1) {
    bulk.mutate(
      {
        lead_ids: props.leadIds,
        assigned_to: ownerId.value!,
        reason: reason.value || undefined,
        color: colour,
      },
      { onSuccess: onDone, onError: onErr },
    );
  } else {
    assign.mutate(
      {
        id: props.leadIds[0],
        body: {
          assigned_to: ownerId.value,
          reason: reason.value || undefined,
          color: colour,
        },
      },
      { onSuccess: onDone, onError: onErr },
    );
  }
}
</script>

<template>
  <Drawer
    :open="open"
    :title="leadIds.length > 1 ? `Assign ${leadIds.length} leads` : 'Assign lead'"
    description="Choose the owner and optionally record a reason."
    width="26rem"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Assign to</label>
        <UserPicker v-model="ownerId" placeholder="Select owner…" />
      </div>

      <!-- Owner colour — required for sales staff (level >= 4). -->
      <div v-if="requiresColour" class="space-y-1.5">
        <label class="text-sm font-medium text-fg">
          Owner colour <span class="text-status-danger">*</span>
        </label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="o in colourOptions"
            :key="o.value"
            type="button"
            :title="o.label"
            :aria-label="o.label"
            :aria-pressed="color === o.value"
            :class="
              cn(
                'size-7 rounded-full border-2 transition-transform',
                color === o.value
                  ? 'border-fg ring-2 ring-ring ring-offset-1 ring-offset-surface scale-110'
                  : 'border-border hover:scale-105',
              )
            "
            :style="{ backgroundColor: o.value }"
            @click="color = o.value"
          />
        </div>
        <p class="text-xs text-muted">
          {{
            assignee?.colors?.length
              ? 'Defaulted to this user’s colour — change it if needed.'
              : 'This user has no saved colour; pick one for this assignment.'
          }}
        </p>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">
          Reason
          <span v-if="isReassign" class="text-status-danger">*</span>
          <span v-else class="text-muted">(optional)</span>
        </label>
        <Input v-model="reason" placeholder="e.g. Territory handoff" />
        <p v-if="isReassign" class="text-xs text-muted">
          A reason is required when reassigning a lead that already has an owner.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="!valid" :loading="pending()" @click="submit">
          Assign
        </Button>
      </div>
    </template>
  </Drawer>
</template>
