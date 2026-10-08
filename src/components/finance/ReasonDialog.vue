<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import type { StatusTone } from '@/types';

/* Captures an optional/required reason for a reject/cancel decision. The
 * reason lands in the transaction status history + client finance
 * timeline for the audit trail. */
const props = defineProps<{
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: StatusTone;
  reasonRequired?: boolean;
  loading?: boolean;
}>();
const emit = defineEmits<{
  'update:open': [v: boolean];
  confirm: [reason: string];
}>();

const reason = ref('');
watch(
  () => props.open,
  (o) => o && (reason.value = ''),
);
const valid = computed(() => !props.reasonRequired || reason.value.trim().length > 0);
</script>

<template>
  <Modal
    :open="open"
    :title="title"
    :description="description"
    size="md"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-1.5">
      <label class="text-sm font-medium text-fg">
        Reason
        <span v-if="reasonRequired" class="text-status-danger">*</span>
        <span v-else class="text-muted">(optional)</span>
      </label>
      <textarea
        v-model="reason"
        rows="3"
        maxlength="1000"
        placeholder="Add context for the audit trail…"
        class="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
    <div class="mt-3 flex justify-end gap-2">
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
      <Button
        :variant="tone === 'danger' ? 'danger' : 'primary'"
        size="sm"
        :disabled="!valid"
        :loading="loading"
        @click="emit('confirm', reason.trim())"
      >
        {{ confirmLabel ?? 'Confirm' }}
      </Button>
    </div>
  </Modal>
</template>
