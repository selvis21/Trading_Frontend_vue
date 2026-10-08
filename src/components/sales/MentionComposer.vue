<script setup lang="ts">
import { ref } from 'vue';
import { AtSign } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import UserPicker from '@/components/sales/UserPicker.vue';
import { useCreateMention } from '@/queries/mentions';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';

/* Compose a follow-up / mention against a lead, optionally directed at a
 * teammate and scheduled with a reminder date. */
const props = defineProps<{ leadId: number }>();
const emit = defineEmits<{ created: [] }>();

const title = ref('');
const remindAt = ref('');
const userId = ref<number | null>(null);
const create = useCreateMention();
const toast = useToast();

/* `remind_at` is rejected by the backend unless it is in the future. A
 * date-only value parses to midnight (past for "today"), so use datetime-local
 * and block past selection with a `min` of the current minute. */
function nowForInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const minRemindAt = ref(nowForInput());

function submit() {
  const t = title.value.trim();
  if (!t) return;
  create.mutate(
    {
      title: t,
      remind_at: remindAt.value || undefined,
      mentioned_user_id: userId.value ?? undefined,
      lead_id: props.leadId,
    },
    {
      onSuccess: () => {
        title.value = '';
        remindAt.value = '';
        userId.value = null;
        toast.success('Reminder created');
        emit('created');
      },
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}
</script>

<template>
  <div class="space-y-2 rounded-lg border border-border bg-surface p-3">
    <Input v-model="title" placeholder="Follow-up title…" />
    <div class="flex gap-2">
      <Input
        v-model="remindAt"
        type="datetime-local"
        :min="minRemindAt"
        class="w-52"
        @focus="minRemindAt = nowForInput()"
      />
      <div class="flex-1">
        <UserPicker v-model="userId" placeholder="Mention teammate (optional)" />
      </div>
    </div>
    <div class="flex justify-end">
      <Button
        size="sm"
        :disabled="!title.trim()"
        :loading="create.isPending.value"
        @click="submit"
      >
        <AtSign class="size-3.5" /> Create reminder
      </Button>
    </div>
  </div>
</template>
