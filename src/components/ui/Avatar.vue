<script setup lang="ts">
import { computed } from 'vue';
import { cn, initials, hueFromString } from '@/lib/utils';

const props = defineProps<{
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  class?: string;
}>();

const sizeClass = computed(
  () =>
    ({
      xs: 'size-6 text-[10px]',
      sm: 'size-8 text-xs',
      md: 'size-9 text-sm',
      lg: 'size-11 text-base',
    })[props.size ?? 'md'],
);

const style = computed(() => {
  const hue = hueFromString(props.name ?? '?');
  return {
    backgroundColor: `hsl(${hue} 60% 92%)`,
    color: `hsl(${hue} 55% 32%)`,
  };
});
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-1 ring-border',
        sizeClass,
        props.class,
      )
    "
    :style="src ? undefined : style"
    :title="name ?? undefined"
  >
    <img
      v-if="src"
      :src="src"
      :alt="name ?? ''"
      class="size-full object-cover"
    />
    <template v-else>{{ initials(name) }}</template>
  </span>
</template>
