<script setup lang="ts">
import { computed, ref } from 'vue';
import { CircleUserRound } from '@lucide/vue';
import Spinner from '@/components/ui/Spinner.vue';
import SelectedClientCard from '@/components/trading/SelectedClientCard.vue';
import ClientPicker from '@/components/sales/ClientPicker.vue';
import ClientFormModal from '@/components/sales/ClientFormModal.vue';
import { useClientDetail } from '@/queries/clients';
import type { Client } from '@/types/sales';

/* Client-first selector shared by the finance money drawers (deposit /
 * withdrawal / transfer / credit).
 *
 * It replaces the old raw "Client ID" number input: the operator searches by
 * name, email, mobile or client code (or creates the client), and the numeric
 * id is carried internally — never typed. When the drawer is launched from a
 * client context (`lockedClientId`) the client is locked and shown read-only.
 *
 * NOTE: intentionally a plain inline popover (not portalled) so it keeps
 * working inside the drawers' focus scope — the same contract ClientPicker
 * documents. This is why the finance drawers use a Sheet, not a transformed
 * centred Modal: a fixed-positioned popover misplaces inside a transform. */
const props = defineProps<{
  modelValue: Client | null;
  /** Set when launched from a client context — locks the selection. */
  lockedClientId?: number | null;
}>();
const emit = defineEmits<{ 'update:modelValue': [v: Client | null] }>();

const modalOpen = ref(false);
const locked = computed(() => !!props.lockedClientId);

// Identity for the locked case (needs leads.view; falls back to a code chip).
const detail = useClientDetail(() => props.lockedClientId ?? null);
const lockedClient = computed<Client | null>(() => detail.data.value ?? null);
const lockedLabel = computed(() =>
  props.lockedClientId ? `Client #${props.lockedClientId}` : '',
);

function onCreated(client: Client) {
  emit('update:modelValue', client);
  modalOpen.value = false;
}
</script>

<template>
  <div class="space-y-1.5">
    <label class="flex items-center gap-1.5 text-sm font-medium text-fg">
      <CircleUserRound class="size-4 text-muted" /> Client
    </label>

    <!-- Locked: launched from a client context. -->
    <template v-if="locked">
      <SelectedClientCard
        v-if="lockedClient"
        :client="lockedClient"
        :loading="detail.isLoading.value"
        locked
      />
      <div
        v-else
        class="flex items-center gap-2 rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-muted"
      >
        <Spinner v-if="detail.isLoading.value" />
        <span class="font-mono text-fg">{{ lockedLabel }}</span>
      </div>
    </template>

    <!-- Searchable selection. -->
    <template v-else>
      <SelectedClientCard
        v-if="props.modelValue"
        :client="props.modelValue"
        @change="emit('update:modelValue', null)"
      />
      <template v-else>
        <ClientPicker
          :model-value="props.modelValue"
          @update:model-value="emit('update:modelValue', $event)"
          @add-new="modalOpen = true"
        />
        <p class="text-xs text-muted">
          Search by name, email, mobile or client code — or create the client now.
        </p>
      </template>
    </template>
  </div>

  <ClientFormModal
    :open="modalOpen"
    @update:open="modalOpen = $event"
    @created="onCreated"
  />
</template>
