<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import Switch from '@/components/ui/Switch.vue';
import { cn } from '@/lib/utils';
import type { Setting, SettingType } from '@/types/admin';

/* Setting editor — value input adapts to the declared type
 * (boolean→switch, integer/float→number, json→validated textarea). The
 * key is immutable. The page owns the upsert mutation. */
const props = defineProps<{
  open: boolean;
  setting: Setting | null;
  /** create ⇒ editable key + blank defaults; edit ⇒ immutable key. */
  mode?: 'edit' | 'create';
  submitting?: boolean;
  canManage?: boolean;
}>();

const emit = defineEmits<{
  'update:open': [v: boolean];
  submit: [values: { key: string; value: unknown; type: SettingType; description: string | null; is_public: boolean; group?: string }];
}>();

const TYPES: SettingType[] = ['string', 'integer', 'boolean', 'float', 'json'];

const isCreate = computed(() => props.mode === 'create');
const keyInput = ref('');
const groupInput = ref('general');
const type = ref<SettingType>('string');
const strVal = ref('');
const numVal = ref<number | null>(null);
const boolVal = ref(false);
const jsonVal = ref('');
const description = ref('');
const isPublic = ref(false);
const jsonError = ref('');

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    if (isCreate.value) {
      keyInput.value = '';
      groupInput.value = 'general';
      type.value = 'string';
      strVal.value = '';
      numVal.value = null;
      boolVal.value = false;
      jsonVal.value = '{}';
      description.value = '';
      isPublic.value = false;
      jsonError.value = '';
      return;
    }
    if (!props.setting) return;
    const s = props.setting;
    type.value = s.type;
    description.value = s.description ?? '';
    isPublic.value = s.is_public;
    jsonError.value = '';
    strVal.value = typeof s.value === 'string' ? s.value : s.value == null ? '' : String(s.value);
    numVal.value = typeof s.value === 'number' ? s.value : Number(s.value) || null;
    boolVal.value = !!s.value;
    jsonVal.value = (() => {
      try {
        return JSON.stringify(s.value ?? {}, null, 2);
      } catch {
        return '{}';
      }
    })();
  },
  { immediate: true },
);

const valid = computed(() => {
  if (isCreate.value && keyInput.value.trim() === '') return false;
  if (type.value === 'json') {
    try {
      JSON.parse(jsonVal.value || 'null');
      return true;
    } catch {
      return false;
    }
  }
  return true;
});

function submit() {
  if (!props.canManage || !valid.value) return;
  let value: unknown;
  switch (type.value) {
    case 'boolean':
      value = boolVal.value;
      break;
    case 'integer':
      value = numVal.value === null ? null : Math.trunc(numVal.value);
      break;
    case 'float':
      value = numVal.value;
      break;
    case 'json':
      try {
        value = JSON.parse(jsonVal.value || 'null');
      } catch {
        jsonError.value = 'Invalid JSON';
        return;
      }
      break;
    default:
      value = strVal.value;
  }
  emit('submit', {
    key: isCreate.value ? keyInput.value.trim() : props.setting!.key,
    value,
    type: type.value,
    description: description.value.trim() || null,
    is_public: isPublic.value,
    ...(isCreate.value ? { group: groupInput.value.trim() || 'general' } : {}),
  });
}

const fieldCls =
  'w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="32rem"
    :title="isCreate ? 'New setting' : setting ? `Setting · ${setting.key}` : 'Setting'"
    :description="canManage ? 'Edit the value, type and visibility.' : 'Read-only.'"
    @update:open="emit('update:open', $event)"
  >
    <div v-if="isCreate || setting" class="space-y-5">
      <div v-if="isCreate" class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Key <span class="text-status-danger">*</span></label>
        <input v-model="keyInput" :disabled="!canManage" :class="cn(fieldCls, 'font-mono')" placeholder="e.g. trading.max_leverage" />
        <label class="mt-2 block text-sm font-medium text-fg">Group</label>
        <input v-model="groupInput" :disabled="!canManage" :class="fieldCls" placeholder="general" />
      </div>
      <div v-else-if="setting" class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Key</label>
        <input :value="setting.key" disabled :class="cn(fieldCls, 'font-mono')" />
        <p class="text-xs text-muted">Group: {{ setting.group }}</p>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Type</label>
        <select v-model="type" :disabled="!canManage" :class="fieldCls">
          <option v-for="t in TYPES" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Value</label>
        <div v-if="type === 'boolean'" class="flex items-center gap-2">
          <Switch :model-value="boolVal" :disabled="!canManage" aria-label="Value" @update:model-value="boolVal = $event" />
          <span class="text-sm text-muted">{{ boolVal ? 'true' : 'false' }}</span>
        </div>
        <input
          v-else-if="type === 'integer' || type === 'float'"
          v-model.number="numVal"
          type="number"
          :step="type === 'integer' ? 1 : 'any'"
          :disabled="!canManage"
          :class="cn(fieldCls, 'tabular-nums')"
        />
        <textarea
          v-else-if="type === 'json'"
          v-model="jsonVal"
          :disabled="!canManage"
          rows="6"
          :class="cn(fieldCls, 'font-mono text-xs', !valid && 'border-status-danger')"
        />
        <input v-else v-model="strVal" :disabled="!canManage" :class="fieldCls" />
        <p v-if="type === 'json' && !valid" class="text-xs text-status-danger">Invalid JSON.</p>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Description</label>
        <input v-model="description" :disabled="!canManage" :class="fieldCls" placeholder="Optional" />
      </div>

      <div class="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div>
          <p class="text-sm text-fg">Public</p>
          <p class="text-xs text-muted">Exposed to unauthenticated clients.</p>
        </div>
        <Switch :model-value="isPublic" :disabled="!canManage" aria-label="Public" @update:model-value="isPublic = $event" />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="emit('update:open', false)">
          {{ canManage ? 'Cancel' : 'Close' }}
        </Button>
        <Button v-if="canManage" size="sm" :disabled="!valid" :loading="submitting" @click="submit">
          Save setting
        </Button>
      </div>
    </template>
  </Sheet>
</template>
