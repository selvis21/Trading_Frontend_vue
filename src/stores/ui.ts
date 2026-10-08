import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useStorage, usePreferredDark } from '@vueuse/core';
import type { Density, Locale, ThemeMode } from '@/types';

/* ------------------------------------------------------------------ *
 * UI store — purely client-side chrome state: theme, density, locale,
 * sidebar, and the command-palette toggle. Persisted to localStorage
 * and reflected onto <html> (keys mirror the pre-hydration script).
 * ------------------------------------------------------------------ */
export const useUiStore = defineStore('ui', () => {
  const theme = useStorage<ThemeMode>('crm.theme', 'system');
  const density = useStorage<Density>('crm.density', 'comfortable');
  const locale = useStorage<Locale>('crm.locale', 'en');
  const sidebarCollapsed = useStorage('crm.sidebar.collapsed', false);
  const sidebarMobileOpen = ref(false);
  const commandOpen = ref(false);

  const prefersDark = usePreferredDark();
  const isDark = computed(() =>
    theme.value === 'dark' || (theme.value === 'system' && prefersDark.value),
  );
  const isRtl = computed(() => locale.value === 'ar');

  function applyToDocument(): void {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark.value);
    root.style.colorScheme = isDark.value ? 'dark' : 'light';
    root.classList.toggle('density-compact', density.value === 'compact');
    root.setAttribute('dir', isRtl.value ? 'rtl' : 'ltr');
    root.setAttribute('lang', locale.value);
  }

  watch([isDark, density, isRtl, locale], applyToDocument, { immediate: false });

  function setTheme(mode: ThemeMode): void {
    theme.value = mode;
  }
  function cycleTheme(): void {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    theme.value = order[(order.indexOf(theme.value) + 1) % order.length];
  }
  function setDensity(d: Density): void {
    density.value = d;
  }
  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }
  function toggleCommand(open?: boolean): void {
    commandOpen.value = open ?? !commandOpen.value;
  }

  return {
    theme,
    density,
    locale,
    sidebarCollapsed,
    sidebarMobileOpen,
    commandOpen,
    isDark,
    isRtl,
    setTheme,
    cycleTheme,
    setDensity,
    toggleSidebar,
    toggleCommand,
    applyToDocument,
  };
});
