<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue';
</script>

<template>
  <div class="space-y-3 rounded-lg border border-border p-4">
    <div class="flex items-center justify-between">
      <Skeleton class="h-3 w-24" />
      <Skeleton class="size-8 rounded-md" />
    </div>
    <Skeleton class="h-7 w-2/3" />
    <Skeleton class="h-2.5 w-1/3" />
  </div>
</template>
