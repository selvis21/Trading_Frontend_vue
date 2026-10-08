<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue';

const props = defineProps<{ rows?: number; cols?: number }>();
const rowCount = props.rows ?? 8;
const colCount = props.cols ?? 5;
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border">
    <div class="flex gap-4 border-b border-border bg-surface-sunken px-4 py-3">
      <Skeleton v-for="c in colCount" :key="c" class="h-3 flex-1" />
    </div>
    <div
      v-for="r in rowCount"
      :key="r"
      class="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
    >
      <Skeleton
        v-for="c in colCount"
        :key="c"
        class="h-3 flex-1"
        :style="{ opacity: 1 - r * 0.05 }"
      />
    </div>
  </div>
</template>
