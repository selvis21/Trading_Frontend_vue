import { useStorage } from '@vueuse/core';
import type { LeadFilters } from '@/types/sales';

/* ------------------------------------------------------------------ *
 * Saved filters (a.k.a. saved views) — named filter presets persisted
 * client-side per user. The backend has no saved-view endpoint yet, so
 * these live in localStorage and are shareable via the URL query.
 * ------------------------------------------------------------------ */
export interface SavedFilter {
  id: string;
  name: string;
  filters: LeadFilters;
}

export function useSavedFilters() {
  const items = useStorage<SavedFilter[]>('crm.leads.savedFilters', []);

  function save(name: string, filters: LeadFilters): SavedFilter {
    const view: SavedFilter = {
      id: `${name}-${items.value.length}-${name.length}`,
      name,
      filters: { ...filters },
    };
    items.value = [...items.value.filter((v) => v.name !== name), view];
    return view;
  }
  function remove(id: string): void {
    items.value = items.value.filter((v) => v.id !== id);
  }

  return { items, save, remove };
}
