<script setup lang="ts">
import { computed } from 'vue';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Gift,
  Receipt,
  SlidersHorizontal,
} from '@lucide/vue';
import Badge from '@/components/ui/Badge.vue';
import { TRANSACTION_TYPE_TONE, type TransactionType } from '@/types/finance';

/* Transaction-type pill — type + glyph, distinct from the status badge so
 * type and status never collide visually. */
const props = defineProps<{ type: TransactionType | null | undefined }>();

const ICONS: Record<TransactionType, typeof ArrowDownToLine> = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  transfer: ArrowLeftRight,
  credit: Gift,
  fee: Receipt,
  adjustment: SlidersHorizontal,
};

const tone = computed(() => (props.type ? TRANSACTION_TYPE_TONE[props.type] : 'neutral'));
const icon = computed(() => (props.type ? ICONS[props.type] : SlidersHorizontal));
const label = computed(() =>
  props.type ? props.type[0].toUpperCase() + props.type.slice(1) : '—',
);
</script>

<template>
  <Badge :tone="tone">
    <component :is="icon" class="size-3" />
    {{ label }}
  </Badge>
</template>
