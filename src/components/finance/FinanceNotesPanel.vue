<script setup lang="ts">
import { ref } from 'vue';
import { Trash2, StickyNote } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import {
  useFinanceNotes,
  useAddFinanceNote,
  useDeleteFinanceNote,
} from '@/queries/finance';

/* Finance notes for a client (optionally linked to a transaction). Add is
 * gated by finance.notes.manage. */
const props = defineProps<{ clientId: number; transactionId?: number | null }>();

const auth = useAuthStore();
const toast = useToast();
const notes = useFinanceNotes(() => props.clientId);
const add = useAddFinanceNote();
const remove = useDeleteFinanceNote();

const canManage = auth.can('finance.notes.manage');
const body = ref('');

function submit() {
  const text = body.value.trim();
  if (!text) return;
  add.mutate(
    { clientId: props.clientId, body: text, transactionId: props.transactionId },
    {
      onSuccess: () => {
        body.value = '';
        toast.success('Note added');
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

function del(noteId: number) {
  remove.mutate(
    { noteId, clientId: props.clientId },
    { onError: (e) => toast.fromError(e) },
  );
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="canManage" class="space-y-2">
      <textarea
        v-model="body"
        rows="2"
        maxlength="5000"
        placeholder="Add a finance note…"
        class="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div class="flex justify-end">
        <Button size="sm" :disabled="!body.trim()" :loading="add.isPending.value" @click="submit">
          Add note
        </Button>
      </div>
    </div>

    <SkeletonList v-if="notes.isLoading.value" :rows="3" />
    <EmptyState
      v-else-if="!notes.data.value?.length"
      :icon="StickyNote"
      title="No notes"
      description="Finance notes for this client appear here."
      class="border-0"
    />
    <ul v-else class="space-y-2">
      <li
        v-for="n in notes.data.value"
        :key="n.id"
        class="group rounded-lg border border-border bg-surface p-3"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="whitespace-pre-wrap text-sm text-fg">{{ n.body }}</p>
          <button
            v-if="canManage"
            class="shrink-0 text-muted opacity-0 transition-opacity hover:text-status-danger group-hover:opacity-100"
            aria-label="Delete note"
            @click="del(n.id)"
          >
            <Trash2 class="size-3.5" />
          </button>
        </div>
        <p class="mt-1 text-xs text-muted">
          <span v-if="n.finance_transaction_id">Txn #{{ n.finance_transaction_id }} · </span>
          {{ timeAgo(n.created_at) }}
        </p>
      </li>
    </ul>
  </div>
</template>
