<script setup lang="ts">
import { ref } from 'vue';
import { SendHorizontal } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import { useAddNote } from '@/queries/leads';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';

/* Inline note composer. ⌘/Ctrl+Enter submits. */
const props = defineProps<{ leadId: number }>();
const emit = defineEmits<{ added: [] }>();

const body = ref('');
const add = useAddNote();
const toast = useToast();

function submit() {
  const text = body.value.trim();
  if (!text) return;
  add.mutate(
    { id: props.leadId, body: text },
    {
      onSuccess: () => {
        body.value = '';
        emit('added');
      },
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}
</script>

<template>
  <div class="rounded-lg border border-border bg-surface focus-within:ring-1 focus-within:ring-ring">
    <textarea
      v-model="body"
      rows="2"
      maxlength="5000"
      placeholder="Add a note… (⌘↵ to save)"
      class="w-full resize-none rounded-t-lg bg-transparent px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none"
      @keydown.meta.enter="submit"
      @keydown.ctrl.enter="submit"
    />
    <div class="flex items-center justify-between px-2 py-1.5">
      <span class="text-[11px] text-muted">{{ body.length }}/5000</span>
      <Button
        size="sm"
        :disabled="!body.trim()"
        :loading="add.isPending.value"
        @click="submit"
      >
        <SendHorizontal class="size-3.5" /> Add note
      </Button>
    </div>
  </div>
</template>
