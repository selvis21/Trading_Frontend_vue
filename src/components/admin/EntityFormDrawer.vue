<script setup lang="ts" generic="T extends Record<string, any>">
import { ref, computed, watch } from 'vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import Switch from '@/components/ui/Switch.vue';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Schema-driven create/edit drawer — the drawer-first surface shared by
 * every uniform admin/reference CRUD form. The parent passes a field
 * schema + the record under edit (null ⇒ create) and receives the built
 * payload on submit; mutation wiring (optimistic updates, toasts) stays
 * in the page. Permission-aware: read-only when `canManage` is false.
 * ------------------------------------------------------------------ */
export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'textarea' | 'switch' | 'select' | 'multiselect' | 'color';
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  /** Only collect this field when creating (e.g. password). */
  createOnly?: boolean;
  /** Default for the create form. */
  default?: unknown;
  /**
   * Conditional visibility based on the current form values. When it returns
   * false the field is hidden AND excluded from both validation and the
   * submitted payload (so dependent fields like `user_type` only apply to the
   * level that requires them). Reactive to in-form edits.
   */
  showIf?: (values: Record<string, unknown>) => boolean;
}

const props = defineProps<{
  open: boolean;
  title: string;
  record: T | null;
  fields: FieldDef[];
  submitting?: boolean;
  canManage?: boolean;
  width?: string;
}>();

const emit = defineEmits<{
  'update:open': [v: boolean];
  submit: [values: Record<string, unknown>];
}>();

const form = ref<Record<string, any>>({});

const isEdit = computed(() => props.record !== null);
// Reactive to `form` so `showIf` predicates (e.g. level === Sales Agent)
// re-evaluate as the user edits. Hidden fields are excluded from rendering,
// validation, and the payload.
const visibleFields = computed(() =>
  props.fields.filter(
    (f) =>
      !(f.createOnly && isEdit.value) &&
      (!f.showIf || f.showIf(form.value)),
  ),
);

function hydrate() {
  const next: Record<string, any> = {};
  for (const f of props.fields) {
    if (props.record && f.key in props.record) {
      next[f.key] = (props.record as Record<string, any>)[f.key];
    } else if (f.type === 'switch') {
      next[f.key] = f.default ?? false;
    } else if (f.type === 'multiselect' || f.type === 'color') {
      next[f.key] = (f.default as unknown[]) ?? [];
    } else {
      next[f.key] = f.default ?? (f.type === 'number' ? null : '');
    }
  }
  form.value = next;
}

watch(
  () => props.open,
  (o) => {
    if (o) hydrate();
  },
  { immediate: true },
);

const valid = computed(() =>
  visibleFields.value.every((f) => {
    if (!f.required) return true;
    const v = form.value[f.key];
    if (f.type === 'number') return v !== null && v !== '' && !Number.isNaN(v);
    return v !== null && v !== undefined && String(v).trim() !== '';
  }),
);

/** Swatches for a 'color' field: the palette PLUS any already-stored value not
 * in the palette (so existing/legacy colours still render and stay editable). */
function swatchOptions(f: FieldDef): { value: string | number; label: string }[] {
  const opts = f.options ?? [];
  const known = new Set(opts.map((o) => o.value));
  const current: (string | number)[] = Array.isArray(form.value[f.key]) ? form.value[f.key] : [];
  const extra = current
    .filter((v) => !known.has(v))
    .map((v) => ({ value: v, label: String(v) }));
  return [...opts, ...extra];
}

function toggleMulti(key: string, value: string | number) {
  const arr: (string | number)[] = Array.isArray(form.value[key]) ? [...form.value[key]] : [];
  const i = arr.indexOf(value);
  if (i === -1) arr.push(value);
  else arr.splice(i, 1);
  form.value[key] = arr;
}

function submit() {
  if (!valid.value || !props.canManage) return;
  const payload: Record<string, unknown> = {};
  for (const f of visibleFields.value) {
    let v = form.value[f.key];
    if (f.type === 'number' && (v === '' || v === undefined)) v = null;
    payload[f.key] = v;
  }
  emit('submit', payload);
}

const fieldCls =
  'w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    :width="width ?? '32rem'"
    :title="title"
    :description="canManage ? undefined : 'Read-only — you cannot manage these records.'"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5">
      <div v-for="f in visibleFields" :key="f.key" class="space-y-1.5">
        <label class="text-sm font-medium text-fg">
          {{ f.label }}
          <span v-if="f.required" class="text-status-danger">*</span>
        </label>

        <!-- switch -->
        <div v-if="f.type === 'switch'" class="flex items-center gap-2">
          <Switch
            :model-value="!!form[f.key]"
            :disabled="!canManage"
            :aria-label="f.label"
            @update:model-value="form[f.key] = $event"
          />
          <span class="text-sm text-muted">{{ form[f.key] ? 'Enabled' : 'Disabled' }}</span>
        </div>

        <!-- select -->
        <select
          v-else-if="f.type === 'select'"
          v-model="form[f.key]"
          :disabled="!canManage"
          :class="fieldCls"
        >
          <option :value="null">—</option>
          <option v-for="o in f.options ?? []" :key="String(o.value)" :value="o.value">
            {{ o.label }}
          </option>
        </select>

        <!-- multiselect (chips) -->
        <div v-else-if="f.type === 'multiselect'" class="flex flex-wrap gap-1.5">
          <button
            v-for="o in f.options ?? []"
            :key="String(o.value)"
            type="button"
            :disabled="!canManage"
            :class="
              cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60',
                (form[f.key] ?? []).includes(o.value)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted hover:bg-muted-surface',
              )
            "
            @click="toggleMulti(f.key, o.value)"
          >
            {{ o.label }}
          </button>
          <p v-if="!(f.options ?? []).length" class="text-xs text-muted">No options available.</p>
        </div>

        <!-- color (swatch multi-select → string[]) -->
        <div v-else-if="f.type === 'color'" class="flex flex-wrap gap-1.5">
          <button
            v-for="o in swatchOptions(f)"
            :key="String(o.value)"
            type="button"
            :disabled="!canManage"
            :title="o.label"
            :aria-label="o.label"
            :aria-pressed="(form[f.key] ?? []).includes(o.value)"
            :class="
              cn(
                'size-7 rounded-full border-2 transition-transform disabled:opacity-60',
                (form[f.key] ?? []).includes(o.value)
                  ? 'border-fg ring-2 ring-ring ring-offset-1 ring-offset-surface scale-110'
                  : 'border-border hover:scale-105',
              )
            "
            :style="{ backgroundColor: String(o.value) }"
            @click="toggleMulti(f.key, o.value)"
          />
        </div>

        <!-- textarea -->
        <textarea
          v-else-if="f.type === 'textarea'"
          v-model="form[f.key]"
          :disabled="!canManage"
          :placeholder="f.placeholder"
          rows="3"
          :class="fieldCls"
        />

        <!-- number -->
        <input
          v-else-if="f.type === 'number'"
          v-model.number="form[f.key]"
          type="number"
          :min="f.min"
          :max="f.max"
          :disabled="!canManage"
          :placeholder="f.placeholder"
          :class="cn(fieldCls, 'tabular-nums')"
        />

        <!-- password / text -->
        <input
          v-else
          v-model="form[f.key]"
          :type="f.type === 'password' ? 'password' : 'text'"
          :disabled="!canManage"
          :placeholder="f.placeholder"
          :autocomplete="f.type === 'password' ? 'new-password' : 'off'"
          :class="fieldCls"
        />

        <p v-if="f.help" class="text-xs text-muted">{{ f.help }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="emit('update:open', false)">
          {{ canManage ? 'Cancel' : 'Close' }}
        </Button>
        <Button
          v-if="canManage"
          size="sm"
          :disabled="!valid"
          :loading="submitting"
          @click="submit"
        >
          {{ isEdit ? 'Save changes' : 'Create' }}
        </Button>
      </div>
    </template>
  </Sheet>
</template>
