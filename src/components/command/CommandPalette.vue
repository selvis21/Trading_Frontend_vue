<script setup lang="ts">
import { computed, nextTick, ref, watch, type Component } from 'vue';
import { router } from '@inertiajs/vue3';
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent } from 'reka-ui';
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Moon,
  Sun,
} from '@lucide/vue';
import Kbd from '@/components/ui/Kbd.vue';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { navigation } from '@/components/navigation/navigation';

/* ------------------------------------------------------------------ *
 * Command palette — Navigate / Act groups (entity Search wires into
 * Vue Query in a later sprint). Fully keyboard-driven; permission-aware.
 * ------------------------------------------------------------------ */
interface Command {
  id: string;
  label: string;
  group: 'Navigate' | 'Actions';
  hint?: string;
  icon?: Component;
  run: () => void;
}

const ui = useUiStore();
const auth = useAuthStore();
const query = ref('');
const activeIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

const commands = computed<Command[]>(() => {
  const list: Command[] = [];
  for (const s of navigation) {
    if (s.anyOf && !auth.canAny(s.anyOf)) continue;
    list.push({
      id: `nav-${s.href}`,
      label: s.label,
      group: 'Navigate',
      icon: s.icon,
      hint: 'Go to',
      run: () => navigateTo(s.href),
    });
    for (const c of s.children ?? []) {
      if (c.anyOf && !auth.canAny(c.anyOf)) continue;
      list.push({
        id: `nav-${c.href}`,
        label: `${s.label} › ${c.label}`,
        group: 'Navigate',
        icon: s.icon,
        hint: 'Go to',
        run: () => navigateTo(c.href),
      });
    }
  }
  list.push({
    id: 'act-theme',
    label: ui.isDark ? 'Switch to light theme' : 'Switch to dark theme',
    group: 'Actions',
    icon: ui.isDark ? Sun : Moon,
    run: () => {
      ui.setTheme(ui.isDark ? 'light' : 'dark');
      close();
    },
  });
  return list;
});

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return commands.value;
  return commands.value.filter((c) => c.label.toLowerCase().includes(q));
});

const grouped = computed(() => {
  const map = new Map<string, Command[]>();
  filtered.value.forEach((c) => {
    (map.get(c.group) ?? map.set(c.group, []).get(c.group)!).push(c);
  });
  return [...map.entries()];
});

watch(filtered, () => (activeIndex.value = 0));

watch(
  () => ui.commandOpen,
  async (open) => {
    if (open) {
      query.value = '';
      activeIndex.value = 0;
      await nextTick();
      inputRef.value?.focus();
    }
  },
);

function navigateTo(href: string) {
  close();
  router.visit(href);
}
function close() {
  ui.toggleCommand(false);
}
function move(delta: number) {
  const n = filtered.value.length;
  if (!n) return;
  activeIndex.value = (activeIndex.value + delta + n) % n;
}
function runActive() {
  filtered.value[activeIndex.value]?.run();
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    move(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    move(-1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    runActive();
  }
}

// flat index for highlight bookkeeping across groups
function flatIndex(group: string, i: number): number {
  let idx = 0;
  for (const [g, items] of grouped.value) {
    if (g === group) return idx + i;
    idx += items.length;
  }
  return idx + i;
}
</script>

<template>
  <DialogRoot :open="ui.commandOpen" @update:open="ui.toggleCommand($event)">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in"
      />
      <DialogContent
        class="fixed left-1/2 top-[15vh] z-[61] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        @keydown="onKeydown"
      >
        <div class="flex items-center gap-2.5 border-b border-border px-4">
          <Search class="size-4 text-muted" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Jump to a page or run a command…"
            class="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-muted"
            aria-label="Command palette"
          />
          <Kbd>esc</Kbd>
        </div>

        <div class="max-h-[50vh] overflow-y-auto p-2">
          <div
            v-if="!filtered.length"
            class="px-3 py-8 text-center text-sm text-muted"
          >
            No results for “{{ query }}”
          </div>
          <div v-for="[group, items] in grouped" :key="group" class="mb-1">
            <p
              class="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted"
            >
              {{ group }}
            </p>
            <button
              v-for="(cmd, i) in items"
              :key="cmd.id"
              :class="
                cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-start text-sm transition-colors',
                  flatIndex(group, i) === activeIndex
                    ? 'bg-primary/10 text-primary'
                    : 'text-fg hover:bg-muted-surface',
                )
              "
              @click="cmd.run()"
              @mousemove="activeIndex = flatIndex(group, i)"
            >
              <component :is="cmd.icon" v-if="cmd.icon" class="size-4 shrink-0" />
              <span class="truncate">{{ cmd.label }}</span>
              <span v-if="cmd.hint" class="ms-auto text-xs text-muted">{{
                cmd.hint
              }}</span>
            </button>
          </div>
        </div>

        <div
          class="flex items-center gap-3 border-t border-border bg-surface-sunken px-3 py-2 text-[11px] text-muted"
        >
          <span class="flex items-center gap-1"><Kbd><ArrowUp class="size-2.5" /></Kbd><Kbd><ArrowDown class="size-2.5" /></Kbd> navigate</span>
          <span class="flex items-center gap-1"><Kbd><CornerDownLeft class="size-2.5" /></Kbd> select</span>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
