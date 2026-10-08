<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Switch from '@/components/ui/Switch.vue';
import { cn } from '@/lib/utils';
import { useToast } from '@/composables/useToast';
import {
  useReportCatalog,
  useCreateSchedule,
  useUpdateSchedule,
} from '@/queries/reports';
import type {
  ScheduledReport,
  ScheduleFrequency,
  ReportFilters,
} from '@/types/reports';

/* Create / edit a scheduled report (drawer-first). Format is fixed to CSV
 * (the only backend exporter). Recipients are entered free-form (comma or
 * newline separated) and validated as emails. */
const props = defineProps<{
  open: boolean;
  /** The schedule being edited, or null to create. */
  schedule?: ScheduledReport | null;
  /** Pre-fill the report key (e.g. launched from the viewer). */
  presetReportKey?: string | null;
  /** Pre-fill the filters payload (e.g. the viewer's current filters). */
  presetFilters?: ReportFilters | null;
}>();
const emit = defineEmits<{ 'update:open': [v: boolean]; saved: [] }>();

const toast = useToast();
const catalog = useReportCatalog();
const create = useCreateSchedule();
const update = useUpdateSchedule();

const isEdit = computed(() => !!props.schedule);

const name = ref('');
const reportKey = ref('');
const frequency = ref<ScheduleFrequency>('daily');
const isActive = ref(true);
const recipientsText = ref('');
const nextRunAt = ref('');
const filters = ref<Record<string, unknown>>({});

const frequencies: ScheduleFrequency[] = ['daily', 'weekly', 'monthly'];

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    if (props.schedule) {
      name.value = props.schedule.name;
      reportKey.value = props.schedule.report_key;
      frequency.value = props.schedule.frequency;
      isActive.value = props.schedule.is_active;
      recipientsText.value = props.schedule.recipients.join(', ');
      nextRunAt.value = props.schedule.next_run_at?.slice(0, 16) ?? '';
      filters.value = props.schedule.filters ?? {};
    } else {
      name.value = '';
      reportKey.value = props.presetReportKey ?? '';
      frequency.value = 'daily';
      isActive.value = true;
      recipientsText.value = '';
      nextRunAt.value = '';
      filters.value = (props.presetFilters as Record<string, unknown>) ?? {};
    }
  },
);

const recipients = computed(() =>
  recipientsText.value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean),
);
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invalidEmails = computed(() => recipients.value.filter((r) => !emailRe.test(r)));

const valid = computed(
  () =>
    name.value.trim().length > 0 &&
    reportKey.value.length > 0 &&
    invalidEmails.value.length === 0,
);

function submit() {
  if (!valid.value) return;
  const payload = {
    name: name.value.trim(),
    report_key: reportKey.value,
    frequency: frequency.value,
    format: 'csv' as const,
    filters: filters.value,
    recipients: recipients.value,
    is_active: isActive.value,
    next_run_at: nextRunAt.value ? new Date(nextRunAt.value).toISOString() : null,
  };
  const onDone = {
    onSuccess: () => {
      toast.success(isEdit.value ? 'Schedule updated' : 'Schedule created');
      emit('saved');
      emit('update:open', false);
    },
    onError: (e: unknown) => toast.fromError(e),
  };
  if (isEdit.value && props.schedule) {
    update.mutate({ id: props.schedule.id, payload }, onDone);
  } else {
    create.mutate(payload, onDone);
  }
}

const pending = computed(() => create.isPending.value || update.isPending.value);
const field =
  'w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="32rem"
    :title="isEdit ? 'Edit schedule' : 'New scheduled report'"
    description="Deliver a report on a recurring cadence (CSV by email)."
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Name</label>
        <Input v-model="name" placeholder="e.g. Daily lead conversions" />
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Report</label>
        <select v-model="reportKey" :class="field">
          <option value="" disabled>Select a report</option>
          <option v-for="r in catalog.data.value ?? []" :key="r.key" :value="r.key">
            {{ r.title }}
          </option>
        </select>
      </div>

      <div class="space-y-1.5">
        <span class="text-sm font-medium text-fg">Frequency</span>
        <div class="flex gap-2">
          <button
            v-for="f in frequencies"
            :key="f"
            type="button"
            :class="
              cn(
                'flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors',
                frequency === f ? 'border-primary bg-primary/5 text-fg' : 'border-border text-muted hover:bg-muted-surface',
              )
            "
            @click="frequency = f"
          >
            {{ f }}
          </button>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Recipients</label>
        <textarea
          v-model="recipientsText"
          rows="2"
          placeholder="ops@example.com, manager@example.com"
          class="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p v-if="invalidEmails.length" class="text-xs text-status-danger">
          Invalid email(s): {{ invalidEmails.join(', ') }}
        </p>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">First run <span class="text-muted">(optional)</span></label>
        <input v-model="nextRunAt" type="datetime-local" :class="field" />
      </div>

      <label class="flex items-center justify-between">
        <span class="text-sm font-medium text-fg">Active</span>
        <Switch :model-value="isActive" aria-label="Active" @update:model-value="isActive = $event" />
      </label>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
        <Button size="sm" :disabled="!valid" :loading="pending" @click="submit">
          {{ isEdit ? 'Save changes' : 'Create schedule' }}
        </Button>
      </div>
    </template>
  </Sheet>
</template>
