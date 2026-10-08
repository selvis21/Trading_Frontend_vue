<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { Server } from '@lucide/vue';
import { useTradingPlatforms } from '@/queries/trading';

/* The ONE platform picker for NEW account / application selection.
 *
 * It reads the shared platform reference data with `active: true`, so the
 * backend decides what is selectable and this component cannot drift from
 * the business rule. MT4 is retired (is_active = false), so it never
 * renders here — while every historical MT4 account/application keeps
 * showing MT4 in details, timelines and reports, because those read the
 * platform relation directly and are deliberately NOT filtered.
 *
 * The public Website posts legacy numeric platform values (1 = MT4,
 * 2 = MT5) and WebsiteApplicationRequest maps them back to codes, so the
 * picker emits that same legacy value to keep one payload shape.
 */
const props = withDefaults(
  defineProps<{
    /** Legacy Website value: 1 = MT4, 2 = MT5. */
    modelValue: string;
    /** Prefix for data-testid, e.g. "demo" -> demo-platform-mt5. */
    testidPrefix?: string;
    /**
     * Permission that guards THIS screen. Must be passed by callers whose
     * route permission is not `trading.view`, or the list never loads.
     */
    required?: string | string[];
  }>(),
  { testidPrefix: 'platform', required: 'trading.view' },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

/** code -> the Website's hidden-input numeric value. */
const LEGACY_VALUE: Record<string, string> = { mt4: '1', mt5: '2' };

const platforms = useTradingPlatforms(true, props.required);

const options = computed(() =>
  (platforms.data.value ?? [])
    // Only platforms this form can actually express. The Website payload
    // carries the legacy 1|2 value and WebsiteApplicationRequest maps it
    // back to a code, so a platform with no legacy value cannot be
    // submitted through this form at all — rendering it would produce an
    // option that always fails validation.
    .filter((p) => Boolean(LEGACY_VALUE[p.code]))
    .map((p) => ({
      id: p.id,
      code: p.code,
      label: p.code.toUpperCase(),
      name: p.name,
      value: LEGACY_VALUE[p.code]!,
    })),
);

// Default to the first ACTIVE platform once reference data arrives; a
// hardcoded default would re-introduce a selectable retired platform.
watchEffect(() => {
  if (!props.modelValue && options.value.length) {
    emit('update:modelValue', options.value[0]!.value);
  }
});

const noneAvailable = computed(
  () => !platforms.isPending.value && options.value.length === 0,
);
</script>

<template>
  <section class="space-y-4 rounded-md border border-border bg-surface p-4">
    <h2 class="text-sm font-semibold text-fg">Trading platform</h2>

    <div class="flex gap-2">
      <button
        v-for="o in options"
        :key="o.id"
        type="button"
        :data-testid="`${props.testidPrefix}-platform-${o.code}`"
        :aria-pressed="modelValue === o.value"
        :class="[
          'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
          modelValue === o.value
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-input bg-surface text-muted hover:border-primary/40',
        ]"
        @click="emit('update:modelValue', o.value)"
      >
        {{ o.label }}
      </button>
    </div>

    <p v-if="noneAvailable" class="text-xs text-status-warning" data-testid="platform-none-active">
      No trading platform is currently available for new applications. Please contact your administrator.
    </p>
    <p v-else class="flex items-center gap-1.5 text-xs text-muted">
      <Server class="size-3.5" />
      {{ options.length }} platform<span v-if="options.length !== 1">s</span> available for new
      accounts.
    </p>
  </section>
</template>