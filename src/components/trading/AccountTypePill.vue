<script setup lang="ts">
import { computed } from 'vue';
import Badge from '@/components/ui/Badge.vue';
import { ACCOUNT_TYPE_TONE, type TradingAccountType } from '@/types/trading';
import type { StatusTone } from '@/types';

/* Account-type pill — `ib` reads premium (violet), `live` info, `demo`
 * neutral. Distinct from StatusBadge so type and status never collide. */
const props = defineProps<{ type: TradingAccountType | null | undefined }>();

const tone = computed<StatusTone>(() =>
  props.type ? ACCOUNT_TYPE_TONE[props.type] : 'neutral',
);
const label = computed(() =>
  props.type === 'ib' ? 'IB' : props.type ? props.type[0].toUpperCase() + props.type.slice(1) : '—',
);
</script>

<template>
  <Badge :tone="tone">{{ label }}</Badge>
</template>
