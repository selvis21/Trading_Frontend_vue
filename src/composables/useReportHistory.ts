import { useStorage } from '@vueuse/core';
import type {
  ExportHistoryItem,
  RecentReport,
  ReportFilters,
  SavedReportView,
} from '@/types/reports';

/* ------------------------------------------------------------------ *
 * Client-side reporting history. The backend has no saved-view, recents,
 * or export-history endpoints, so these live in localStorage. Refs are
 * module-level singletons so every consumer shares one reactive source.
 * ------------------------------------------------------------------ */
const savedViews = useStorage<SavedReportView[]>('crm.reports.saved', []);
const recents = useStorage<RecentReport[]>('crm.reports.recent', []);
const exports = useStorage<ExportHistoryItem[]>('crm.reports.exports', []);

const MAX_RECENT = 10;
const MAX_EXPORTS = 25;

let seq = 0;
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function useReportHistory() {
  function saveView(name: string, reportKey: string, filters: ReportFilters): SavedReportView {
    const view: SavedReportView = {
      id: uid('view'),
      name,
      report_key: reportKey,
      filters: { ...filters },
    };
    // Replace any existing view with the same name + report.
    savedViews.value = [
      view,
      ...savedViews.value.filter((v) => !(v.name === name && v.report_key === reportKey)),
    ];
    return view;
  }

  function removeView(id: string): void {
    savedViews.value = savedViews.value.filter((v) => v.id !== id);
  }

  function pushRecent(reportKey: string, title: string): void {
    const entry: RecentReport = { report_key: reportKey, title, at: new Date().toISOString() };
    recents.value = [
      entry,
      ...recents.value.filter((r) => r.report_key !== reportKey),
    ].slice(0, MAX_RECENT);
  }

  function pushExport(reportKey: string, title: string, filename: string): void {
    const entry: ExportHistoryItem = {
      id: uid('exp'),
      report_key: reportKey,
      title,
      filename,
      at: new Date().toISOString(),
    };
    exports.value = [entry, ...exports.value].slice(0, MAX_EXPORTS);
  }

  function clearExports(): void {
    exports.value = [];
  }

  return {
    savedViews,
    recents,
    exports,
    saveView,
    removeView,
    pushRecent,
    pushExport,
    clearExports,
  };
}
