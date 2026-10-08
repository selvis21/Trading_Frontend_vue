<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from './Modal.vue';
import Button from './Button.vue';
import Input from './Input.vue';
import { useConfirm } from '@/composables/useConfirm';

/* Singleton confirmation dialog. Mount once in the app root; driven by
 * useConfirm().confirm(...). Supports a "type to confirm" challenge for
 * money / destructive actions (Stripe-grade guardrail). */
const { state, resolve } = useConfirm();
const challengeInput = ref('');

watch(
  () => state.open,
  (open) => {
    if (open) challengeInput.value = '';
  },
);

const challengeOk = computed(
  () => !state.challenge || challengeInput.value.trim() === state.challenge,
);
const confirmVariant = computed(() =>
  state.tone === 'danger' ? 'danger' : 'primary',
);
</script>

<template>
  <Modal
    :open="state.open"
    :title="state.title"
    :description="state.description"
    size="sm"
    @update:open="(v) => !v && resolve(false)"
  >
    <div v-if="state.challenge" class="space-y-1.5">
      <label class="text-xs font-medium text-muted">
        {{ state.challengeLabel ?? `Type “${state.challenge}” to confirm` }}
      </label>
      <Input v-model="challengeInput" :placeholder="state.challenge" />
    </div>

    <div class="mt-2 flex justify-end gap-2">
      <Button variant="ghost" size="sm" @click="resolve(false)">
        {{ state.cancelLabel ?? 'Cancel' }}
      </Button>
      <Button
        :variant="confirmVariant"
        size="sm"
        :disabled="!challengeOk"
        @click="resolve(true)"
      >
        {{ state.confirmLabel ?? 'Confirm' }}
      </Button>
    </div>
  </Modal>
</template>
