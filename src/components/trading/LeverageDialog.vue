<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ArrowRight } from '@lucide/vue';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';

/* Leverage change with guardrails: 1–5000, shows before → after so the
 * operator sees the delta before committing. Optional group default is
 * surfaced as a one-click preset. */
const props = defineProps<{
  open: boolean;
  current: number | null;
  groupDefault?: number | null;
  loading?: boolean;
}>();
const emit = defineEmits<{
  'update:open': [v: boolean];
  confirm: [leverage: number];
}>();

const value = ref<number | null>(null);
watch(
  () => props.open,
  (o) => o && (value.value = props.current ?? null),
);

const valid = computed(
  () =>
    value.value !== null &&
    Number.isInteger(value.value) &&
    value.value >= 1 &&
    value.value <= 5000 &&
    value.value !== props.current,
);
const presets = [50, 100, 200, 500, 1000];
</script>

<template>
  <Modal
    :open="open"
    title="Change leverage"
    description="Validated 1–5000. Applied on the platform immediately."
    size="md"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <div class="flex items-center justify-center gap-3 rounded-lg border border-border bg-surface-sunken py-4">
        <span class="text-center">
          <span class="block text-xs uppercase tracking-wide text-muted">Current</span>
          <span class="block text-xl font-semibold tabular-nums text-fg">1:{{ current ?? '—' }}</span>
        </span>
        <ArrowRight class="size-5 text-muted" />
        <span class="text-center">
          <span class="block text-xs uppercase tracking-wide text-muted">New</span>
          <span class="block text-xl font-semibold tabular-nums text-primary">1:{{ value ?? '—' }}</span>
        </span>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg" for="leverage-input">Leverage</label>
        <input
          id="leverage-input"
          v-model.number="value"
          type="number"
          min="1"
          max="5000"
          step="1"
          inputmode="numeric"
          class="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm tabular-nums text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div class="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            v-for="p in presets"
            :key="p"
            type="button"
            class="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:border-primary hover:text-primary"
            @click="value = p"
          >
            1:{{ p }}
          </button>
          <button
            v-if="groupDefault"
            type="button"
            class="rounded-md border border-dashed border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:border-primary hover:text-primary"
            @click="value = groupDefault"
          >
            Group default (1:{{ groupDefault }})
          </button>
        </div>
      </div>
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
      <Button
        size="sm"
        :disabled="!valid"
        :loading="loading"
        @click="valid && emit('confirm', value as number)"
      >
        Update leverage
      </Button>
    </div>
  </Modal>
</template>
