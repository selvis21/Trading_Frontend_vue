<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import { useCreateClient } from '@/queries/clients';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';
import type { Client } from '@/types/sales';

/* Inline contact-only client creation for the client-first account
 * workflow. Opens above the New Trading Account drawer (Modal sits at
 * z-80 vs the Sheet's z-50), posts to the existing POST /clients endpoint
 * with the backend's own validation, then returns the created client so the
 * caller can auto-select it. No separate client-creation API or ruleset. */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  created: [client: Client];
}>();

const create = useCreateClient();
const toast = useToast();

const form = reactive({ name: '', email: '', mobile: '' });
const errors = reactive<Record<string, string[]>>({});

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    form.name = '';
    form.email = '';
    form.mobile = '';
    Object.keys(errors).forEach((k) => delete errors[k]);
  },
);

const valid = computed(() => form.name.trim() && (form.email.trim() || form.mobile.trim()));

function submit() {
  if (!valid.value) return;
  Object.keys(errors).forEach((k) => delete errors[k]);

  create.mutate(
    {
      name: form.name.trim(),
      email: form.email.trim() || null,
      mobile: form.mobile.trim() || null,
    },
    {
      onSuccess: (client) => {
        toast.success('Client created', `${client.display_name ?? client.name} is now selected.`);
        emit('created', client);
        emit('update:open', false);
      },
      onError: (e) => {
        if (isApiError(e)) {
          Object.assign(errors, e.errors ?? {});
          toast.fromError(e, 'Could not create client');
        }
      },
    },
  );
}
</script>

<template>
  <Modal
    :open="open"
    size="md"
    title="Add new client"
    description="Register a contact-only client, then continue with the trading account request."
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">
          Name <span class="text-status-danger">*</span>
        </label>
        <Input v-model="form.name" placeholder="Full name" :invalid="!!errors.name" />
        <p v-if="errors.name" class="text-xs text-status-danger">{{ errors.name[0] }}</p>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Email</label>
        <Input v-model="form.email" type="email" placeholder="name@example.com" :invalid="!!errors.email" />
        <p v-if="errors.email" class="text-xs text-status-danger">{{ errors.email[0] }}</p>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Mobile</label>
        <Input v-model="form.mobile" placeholder="+91 00000 00000" :invalid="!!errors.mobile" />
        <p v-if="errors.mobile" class="text-xs text-status-danger">{{ errors.mobile[0] }}</p>
        <p v-else class="text-xs text-muted">Provide an email or a mobile number.</p>
      </div>
    </div>

    <div class="mt-5 flex justify-end gap-2 border-t border-border pt-4">
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
      <Button size="sm" :disabled="!valid" :loading="create.isPending.value" @click="submit">
        Create client
      </Button>
    </div>
  </Modal>
</template>
