<script setup lang="ts">
import { computed } from 'vue';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from '@lucide/vue';
import Button from '@/components/ui/Button.vue';

const props = defineProps<{
  page: number;
  pageSize: number;
  total: number;
  lastPage: number;
  selectedCount?: number;
}>();
const emit = defineEmits<{
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

const from = computed(() =>
  props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1,
);
const to = computed(() => Math.min(props.page * props.pageSize, props.total));
const sizes = [10, 25, 50, 100];

function go(p: number) {
  emit('update:page', Math.min(Math.max(1, p), props.lastPage || 1));
}
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-sm text-muted"
  >
    <div class="flex items-center gap-3">
      <span class="tabular-nums">
        <template v-if="selectedCount">
          <span class="font-medium text-fg">{{ selectedCount }}</span> selected ·
        </template>
        {{ from }}–{{ to }} of
        <span class="font-medium text-fg tabular-nums">{{ total }}</span>
      </span>
      <select
        :value="pageSize"
        class="h-7 rounded-md border border-input bg-surface px-2 text-xs text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @change="
          emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))
        "
      >
        <option v-for="s in sizes" :key="s" :value="s">{{ s }} / page</option>
      </select>
    </div>

    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        :disabled="page <= 1"
        aria-label="First page"
        @click="go(1)"
      >
        <ChevronsLeft />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="go(page - 1)"
      >
        <ChevronLeft />
      </Button>
      <span class="px-2 text-xs tabular-nums">
        Page {{ page }} / {{ lastPage || 1 }}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        :disabled="page >= lastPage"
        aria-label="Next page"
        @click="go(page + 1)"
      >
        <ChevronRight />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        :disabled="page >= lastPage"
        aria-label="Last page"
        @click="go(lastPage)"
      >
        <ChevronsRight />
      </Button>
    </div>
  </div>
</template>
