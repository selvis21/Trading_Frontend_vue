<script setup lang="ts">
import { computed } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import Tooltip from '@/components/ui/Tooltip.vue';
import { cn } from '@/lib/utils';
import type { NavSection } from './navigation';

const props = defineProps<{
  item: NavSection;
  collapsed: boolean;
}>();

const page = usePage();
const active = computed(() => {
  const path = page.url.split('?')[0];
  if (props.item.href === '/') return path === '/';
  return path === props.item.href || path.startsWith(props.item.href + '/') ||
    (props.item.children?.some((c) => path.startsWith(c.href)) ?? false);
});
</script>

<template>
  <li>
    <Tooltip v-if="collapsed" :label="item.label" side="right">
      <Link
        :href="item.href"
        :class="
          cn(
            'flex h-9 items-center justify-center rounded-md transition-colors',
            active
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:bg-muted-surface hover:text-fg',
          )
        "
        :aria-current="active ? 'page' : undefined"
      >
        <component :is="item.icon" class="size-[18px]" />
      </Link>
    </Tooltip>

    <template v-else>
      <Link
        :href="item.href"
        :class="
          cn(
            'group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors',
            active
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:bg-muted-surface hover:text-fg',
          )
        "
        :aria-current="active ? 'page' : undefined"
      >
        <component :is="item.icon" class="size-[18px] shrink-0" />
        <span class="truncate">{{ item.label }}</span>
      </Link>

      <ul
        v-if="active && item.children?.length"
        class="ms-3 mt-0.5 space-y-0.5 border-s border-border ps-3"
      >
        <li v-for="child in item.children" :key="child.href">
          <Link
            :href="child.href"
            :class="
              cn(
                'block rounded-md px-2 py-1.5 text-[13px] transition-colors',
                page.url.split('?')[0] === child.href
                  ? 'font-medium text-fg'
                  : 'text-muted hover:text-fg',
              )
            "
          >
            {{ child.label }}
          </Link>
        </li>
      </ul>
    </template>
  </li>
</template>
