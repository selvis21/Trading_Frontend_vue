<script setup lang="ts">
import Sheet from './Sheet.vue';

/* Drawer = the right-anchored Sheet preset (the app's quick view/edit
 * surface). Kept as a distinct component so call-sites read clearly. */
const props = defineProps<{
  open: boolean;
  title?: string;
  description?: string;
  width?: string;
  class?: string;
}>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();
</script>

<template>
  <Sheet
    side="right"
    :open="props.open"
    :title="props.title"
    :description="props.description"
    :width="props.width ?? '32rem'"
    :class="props.class"
    @update:open="emit('update:open', $event)"
  >
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </Sheet>
</template>
