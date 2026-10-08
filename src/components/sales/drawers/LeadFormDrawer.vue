<script setup lang="ts">
import { reactive, watch, computed } from 'vue';
import Drawer from '@/components/ui/Drawer.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import { useCreateLead, useUpdateLead } from '@/queries/leads';
import { useCampaignSources } from '@/queries/salesReference';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';
import type { Lead } from '@/types/sales';

/* Create or edit a lead. In create mode campaign_source_id is required
 * and an email-or-mobile is enforced (mirrors the backend rules). */
const props = defineProps<{
  open: boolean;
  lead?: Lead | null;
}>();
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [lead: Lead] }>();

const create = useCreateLead();
const update = useUpdateLead();
const sources = useCampaignSources();
const toast = useToast();

const isEdit = computed(() => !!props.lead);
const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  mobile: '',
  type: 'retail' as 'retail' | 'ib',
  campaign_source_id: null as number | null,
  campaign_name: '',
  note: '',
});
const errors = reactive<Record<string, string[]>>({});

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    const l = props.lead;
    form.first_name = l?.first_name ?? '';
    form.last_name = l?.last_name ?? '';
    form.email = l?.email ?? '';
    form.mobile = l?.mobile ?? '';
    form.type = (l?.type as 'retail' | 'ib') ?? 'retail';
    form.campaign_source_id = l?.campaign_source_id ?? null;
    form.campaign_name = l?.campaign_name ?? '';
    form.note = l?.note ?? '';
  },
);

const valid = computed(
  () =>
    form.first_name.trim() &&
    (form.email.trim() || form.mobile.trim()) &&
    (isEdit.value || form.campaign_source_id),
);

function payload(): Record<string, unknown> {
  return {
    first_name: form.first_name,
    last_name: form.last_name || null,
    email: form.email || null,
    mobile: form.mobile || null,
    type: form.type,
    campaign_source_id: form.campaign_source_id,
    campaign_name: form.campaign_name || null,
    note: form.note || null,
  };
}

function submit() {
  Object.keys(errors).forEach((k) => delete errors[k]);
  const onErr = (e: unknown) => {
    if (isApiError(e)) {
      Object.assign(errors, e.errors ?? {});
      toast.fromError(e, 'Could not save lead');
    }
  };
  if (isEdit.value && props.lead) {
    update.mutate(
      { id: props.lead.id, body: payload() },
      {
        onSuccess: (lead) => {
          toast.success('Lead updated');
          emit('saved', lead);
          emit('update:open', false);
        },
        onError: onErr,
      },
    );
  } else {
    create.mutate(payload(), {
      onSuccess: (lead) => {
        toast.success('Lead created');
        emit('saved', lead);
        emit('update:open', false);
      },
      onError: onErr,
    });
  }
}
const pending = computed(() => create.isPending.value || update.isPending.value);
</script>

<template>
  <Drawer
    :open="open"
    :title="isEdit ? 'Edit lead' : 'New lead'"
    width="30rem"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">First name <span class="text-status-danger">*</span></label>
          <Input v-model="form.first_name" :invalid="!!errors.first_name" />
          <p v-if="errors.first_name" class="text-xs text-status-danger">{{ errors.first_name[0] }}</p>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">Last name</label>
          <Input v-model="form.last_name" />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Email</label>
        <Input v-model="form.email" type="email" :invalid="!!errors.email" />
        <p v-if="errors.email" class="text-xs text-status-danger">{{ errors.email[0] }}</p>
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Mobile</label>
        <Input v-model="form.mobile" :invalid="!!errors.mobile" />
        <p class="text-xs text-muted">Provide an email or a mobile number.</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">Type</label>
          <select
            v-model="form.type"
            class="h-9 w-full rounded-md border border-input bg-surface px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="retail">Retail</option>
            <option value="ib">IB</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">
            Source <span v-if="!isEdit" class="text-status-danger">*</span>
          </label>
          <select
            :value="form.campaign_source_id ?? ''"
            class="h-9 w-full rounded-md border border-input bg-surface px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @change="form.campaign_source_id = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null"
          >
            <option value="">— Select —</option>
            <option v-for="s in sources.data.value" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Campaign name</label>
        <Input v-model="form.campaign_name" />
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Note</label>
        <textarea
          v-model="form.note"
          rows="2"
          class="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="!valid" :loading="pending" @click="submit">
          {{ isEdit ? 'Save changes' : 'Create lead' }}
        </Button>
      </div>
    </template>
  </Drawer>
</template>
