<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue';

const props = defineProps<{ rows?: number }>();
const rowCount = props.rows ?? 6;
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="r in rowCount"
      :key="r"
      class="flex items-center gap-3 rounded-lg border border-border p-3"
    >
      <Skeleton class="size-9 rounded-full" />
      <div class="flex-1 space-y-2">
        <Skeleton class="h-3 w-1/3" />
        <Skeleton class="h-2.5 w-1/2" />
      </div>
      <Skeleton class="h-5 w-16 rounded-md" />
    </div>
  </div>
</template>
