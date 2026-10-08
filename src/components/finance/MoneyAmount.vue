<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { useMoney } from '@/composables/useMoney';

/* Canonical money renderer. Takes an INTEGER minor-unit amount + currency
 * id and renders it through `formatMoney` (via useMoney). Never does float
 * maths: an optional `direction` flips the integer sign with Math.abs/negate
 * only, and colouring keys off the integer sign. This is the single money
 * display primitive — all amounts in the Finance module go through it. */
const props = withDefaults(
  defineProps<{
    /** Integer minor units (cents). */
    minor: number | null | undefined;
    currencyId?: number | null;
    /** 'in' forces a positive (credit) sign, 'out' a negative (debit) sign. */
    direction?: 'in' | 'out';
    /** Prefix an explicit + / − sign. */
    signed?: boolean;
    /** Colour emerald/red by direction of money movement. */
    colored?: boolean;
    /** Tabular figures + size. */
    strong?: boolean;
    class?: string;
  }>(),
  { signed: false, colored: false, strong: false },
);

const { formatMinor } = useMoney();

// Integer-only: apply direction by negating the integer magnitude.
const value = computed(() => {
  const base = Math.trunc(props.minor ?? 0);
  if (props.direction === 'in') return Math.abs(base);
  if (props.direction === 'out') return -Math.abs(base);
  return base;
});

const text = computed(() =>
  formatMinor(value.value, props.currencyId, { signed: props.signed || !!props.direction }),
);

const toneClass = computed(() => {
  if (!props.colored) return '';
  if (value.value > 0) return 'text-status-success';
  if (value.value < 0) return 'text-status-danger';
  return 'text-fg';
});
</script>

<template>
  <span
    :class="cn('tabular-nums', strong && 'font-semibold', toneClass, props.class)"
    dir="ltr"
  >
    {{ text }}
  </span>
</template>
