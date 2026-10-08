import { ref, watch, type Ref } from 'vue';

/* ------------------------------------------------------------------ *
 * useAccumulatedRows — accumulate an infinite/paginated query's pages
 * into one stable list that survives component remounts.
 *
 * WHY THIS EXISTS (the Timeline "won't open the second time" bug):
 *
 * Every paginated feed used to do this inline:
 *
 *     watch(() => q.data.value, (data) => {
 *       const seen = new Set(all.value.map((r) => r.id));
 *       const fresh = data.rows.filter((r) => !seen.has(r.id));
 *       all.value = page.value === 1 ? data.rows : [...all.value, ...fresh];
 *     });
 *
 * The QueryClient keeps data **fresh for `staleTime` (30s)**. When a panel is
 * unmounted and remounted within that window (closing and reopening a drawer
 * / switching a tab), vue-query serves the SAME cached object and does not
 * refetch. A non-immediate `watch` therefore never fires, the accumulator
 * stays empty, and the panel renders its empty state ("No activity yet") —
 * i.e. the Timeline appears not to open until the page is refreshed (which
 * clears the cache). The non-immediate watcher also fails on first mount when
 * data is already cached.
 *
 * This composable fixes both by:
 *   1. seeding from `data` on mount (`immediate: true`), and
 *   2. resetting via a record-id watcher registered BEFORE the data watcher,
 *      so switching records clears stale rows first and then seeds the new
 *      record (no stale Record-A data under Record B).
 *
 * @param recordId getter for the record the feed belongs to
 * @param page     the page ref shared with the query (reset to 1 on change)
 * @param data     getter for the query data (`{ rows }` or `undefined`)
 */
export function useAccumulatedRows<T extends { id: number | string }>(
  recordId: () => number | string | null | undefined,
  page: Ref<number>,
  data: () => { rows: T[] } | undefined,
): Ref<T[]> {
  const rows = ref<T[]>([]) as Ref<T[]>;
  let loadedId: number | string | null | undefined = undefined;

  // Reset when the record changes. Registered FIRST so the clear runs before
  // the data watcher, which then seeds the new record's first page.
  watch(recordId, (id) => {
    page.value = 1;
    rows.value = [];
    loadedId = id;
  });

  watch(
    data,
    (payload) => {
      if (!payload) return;
      const id = recordId();
      // First payload for this record (mount, or after a record switch) —
      // take it as page 1 rather than appending onto nothing.
      if (loadedId !== id) {
        loadedId = id;
        page.value = 1;
        rows.value = payload.rows;
        return;
      }
      const seen = new Set(rows.value.map((r) => r.id));
      const fresh = payload.rows.filter((r) => !seen.has(r.id));
      rows.value = page.value === 1 ? payload.rows : [...rows.value, ...fresh];
    },
    { immediate: true },
  );

  return rows;
}
