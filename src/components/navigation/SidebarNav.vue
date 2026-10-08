<script setup lang="ts">
import { computed } from 'vue';
import NavItem from './NavItem.vue';
import { navigation } from './navigation';
import { useAuthStore } from '@/stores/auth';

/* Permission-aware navigation: renders only the sections (and children)
 * the current user can access. */
const props = defineProps<{ collapsed: boolean }>();
const auth = useAuthStore();

/* A section is visible when the user can reach its OWN landing OR any of
 * its children — so a parent menu automatically appears whenever a child
 * page is accessible (e.g. a user with only `finance.methods.manage` still
 * sees Finance ▸ Payment Methods). When the landing itself is not
 * accessible, the parent points at its first reachable child so the menu
 * never leads to an Access-Denied page. Children are filtered by their own
 * permission; action-only permissions therefore gate only their child item,
 * never the parent. */
const visible = computed(() =>
  navigation
    .map((s) => {
      const children = s.children?.filter((c) => !c.anyOf || auth.canAny(c.anyOf));
      const selfOk = !s.anyOf || auth.canAny(s.anyOf);
      return { section: s, children, selfOk };
    })
    .filter(({ children, selfOk }) => selfOk || (children?.length ?? 0) > 0)
    .map(({ section, children, selfOk }) => ({
      ...section,
      href: selfOk ? section.href : (children?.[0]?.href ?? section.href),
      children,
    })),
);
</script>

<template>
  <nav class="flex-1 overflow-y-auto px-2 py-3" aria-label="Primary">
    <ul class="space-y-0.5">
      <NavItem
        v-for="item in visible"
        :key="item.href"
        :item="item"
        :collapsed="props.collapsed"
      />
    </ul>
  </nav>
</template>
