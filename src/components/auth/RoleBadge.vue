<script setup lang="ts">
import { computed } from 'vue';
import Badge from '@/components/ui/Badge.vue';

/* Humanised role chip(s). Accepts a single role or a list. */
const props = defineProps<{
  roles: string | string[];
}>();

const list = computed(() =>
  (Array.isArray(props.roles) ? props.roles : [props.roles]).filter(Boolean),
);

function humanize(role: string): string {
  return role
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
</script>

<template>
  <span class="inline-flex flex-wrap gap-1.5">
    <Badge v-for="role in list" :key="role" tone="accent">
      {{ humanize(role) }}
    </Badge>
    <span v-if="!list.length" class="text-sm text-muted">No roles assigned</span>
  </span>
</template>
