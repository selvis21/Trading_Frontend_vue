<script setup lang="ts">
import { ref } from 'vue';
import { SendHorizontal, Trash2, StickyNote } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { timeAgo } from '@/lib/utils';
import {
  useComplianceNotes,
  useAddComplianceNote,
  useDeleteComplianceNote,
} from '@/queries/compliance';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';

/* Internal compliance notes for a client (audit context). */
const props = defineProps<{ clientId: number; applicationId?: number }>();

const auth = useAuthStore();
const toast = useToast();
const notes = useComplianceNotes(() => props.clientId);
const add = useAddComplianceNote();
const del = useDeleteComplianceNote();

const body = ref('');
const canManage = auth.can('compliance.notes.manage');

function submit() {
  const text = body.value.trim();
  if (!text) return;
  add.mutate(
    { clientId: props.clientId, body: text, applicationId: props.applicationId },
    {
      onSuccess: () => (body.value = ''),
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="canManage" class="rounded-lg border border-border bg-surface focus-within:ring-1 focus-within:ring-ring">
      <textarea
        v-model="body"
        rows="2"
        maxlength="5000"
        placeholder="Add an internal compliance note… (⌘↵)"
        class="w-full resize-none rounded-t-lg bg-transparent px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none"
        @keydown.meta.enter="submit"
        @keydown.ctrl.enter="submit"
      />
      <div class="flex justify-end px-2 py-1.5">
        <Button size="sm" :disabled="!body.trim()" :loading="add.isPending.value" @click="submit">
          <SendHorizontal class="size-3.5" /> Add note
        </Button>
      </div>
    </div>

    <SkeletonList v-if="notes.isLoading.value" :rows="2" />
    <EmptyState
      v-else-if="!notes.data.value?.length"
      :icon="StickyNote"
      title="No notes yet"
      class="border-0"
    />
    <ul v-else class="space-y-2">
      <li v-for="n in notes.data.value" :key="n.id" class="group rounded-lg border border-border bg-surface p-3">
        <p class="whitespace-pre-wrap text-sm text-fg">{{ n.body }}</p>
        <div class="mt-1.5 flex items-center justify-between text-xs text-muted">
          <span>{{ timeAgo(n.created_at) }}</span>
          <button
            v-if="canManage"
            class="opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Delete note"
            @click="del.mutate({ noteId: n.id, clientId })"
          >
            <Trash2 class="size-3.5 hover:text-status-danger" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
