<script setup lang="ts">
import { type Component } from 'vue';
import { RefreshCw } from '@lucide/vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Button from '@/components/ui/Button.vue';

/* Consistent widget shell: header (title + optional icon + action slot)
 * over a body that resolves loading → error → empty → content. Every
 * dashboard widget uses this so states look identical everywhere. */
defineProps<{
  title: string;
  subtitle?: string;
  icon?: Component;
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  emptyText?: string;
  /** Skeleton variant while loading. */
  skeleton?: 'lines' | 'chart' | 'bars';
}>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <section class="flex flex-col rounded-lg border border-border bg-surface">
    <header
      class="flex items-center justify-between gap-2 border-b border-border px-4 py-3"
    >
      <div class="flex min-w-0 items-center gap-2">
        <component :is="icon" v-if="icon" class="size-4 shrink-0 text-muted" />
        <div class="min-w-0">
          <h3 class="truncate text-sm font-semibold text-fg">{{ title }}</h3>
          <p v-if="subtitle" class="truncate text-xs text-muted">
            {{ subtitle }}
          </p>
        </div>
      </div>
      <div class="shrink-0">
        <slot name="action" />
      </div>
    </header>

    <div class="min-h-0 flex-1 p-4">
      <!-- error -->
      <div
        v-if="error"
        class="flex flex-col items-center justify-center gap-2 py-6 text-center"
      >
        <p class="text-sm text-muted">Couldn’t load this widget.</p>
        <Button variant="outline" size="sm" @click="emit('retry')">
          <RefreshCw class="size-3.5" /> Retry
        </Button>
      </div>

      <!-- loading -->
      <div v-else-if="loading" class="space-y-3">
        <template v-if="skeleton === 'chart'">
          <Skeleton class="mx-auto size-28 rounded-full" />
        </template>
        <template v-else-if="skeleton === 'bars'">
          <div v-for="i in 4" :key="i" class="space-y-1.5">
            <Skeleton class="h-3 w-1/3" />
            <Skeleton class="h-2 w-full rounded-full" />
          </div>
        </template>
        <template v-else>
          <Skeleton v-for="i in 3" :key="i" class="h-4" :style="{ width: `${90 - i * 12}%` }" />
        </template>
      </div>

      <!-- empty -->
      <EmptyState
        v-else-if="empty"
        :title="emptyText ?? 'Nothing here yet'"
        class="border-0 py-6"
      />

      <!-- content -->
      <slot v-else />
    </div>

    <footer v-if="$slots.footer" class="border-t border-border px-4 py-2.5">
      <slot name="footer" />
    </footer>
  </section>
</template>
