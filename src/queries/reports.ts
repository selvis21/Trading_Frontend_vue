import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/vue-query';
import { api, http } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import type {
  ReportCatalogEntry,
  ReportDataset,
  ReportFilters,
  ScheduledReport,
  ScheduledReportInput,
} from '@/types/reports';

/* ------------------------------------------------------------------ *
 * Reporting query + mutation layer. Catalogue + report runs are gated by
 * reports.view (per-report permissions are enforced server-side). Report
 * datasets are cached aggressively (the backend also caches per filter
 * signature). Exports stream a CSV synchronously and are fetched as an
 * authenticated blob. Scheduled-report CRUD is gated by reports.schedule.
 * ------------------------------------------------------------------ */
function gate(perm: string) {
  const auth = useAuthStore();
  return computed(() => auth.can(perm));
}

/** Build the query-param object the report-run endpoint understands. */
function toParams(f: ReportFilters): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.business_unit_id != null) p.business_unit_id = f.business_unit_id;
  if (f.domain) p.domain = f.domain;
  return p;
}

export function useReportCatalog() {
  return useQuery({
    queryKey: queryKeys.reports.catalog,
    enabled: gate('reports.view'),
    staleTime: 10 * 60_000,
    queryFn: () =>
      api
        .get<{ reports: ReportCatalogEntry[] }>('/reports')
        .then((d) => d.reports),
  });
}

export function useReport(
  key: MaybeRefOrGetter<string | null>,
  filters: MaybeRefOrGetter<ReportFilters>,
) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.reports.run(toValue(key) ?? '', toParams(toValue(filters))),
    ),
    enabled: computed(() => gate('reports.view').value && !!toValue(key)),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: () =>
      api.get<ReportDataset>(`/reports/${toValue(key)}`, toParams(toValue(filters))),
  });
}

export function useScheduledReports() {
  return useQuery({
    queryKey: queryKeys.reports.scheduled,
    enabled: gate('reports.schedule'),
    staleTime: 30_000,
    queryFn: () => api.get<ScheduledReport[]>('/scheduled-reports'),
  });
}

export function useScheduledReport(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.reports.schedule(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    queryFn: () => api.get<ScheduledReport>(`/scheduled-reports/${toValue(id)}`),
  });
}

/* ----------------------------- mutations ----------------------------- */
function useScheduleInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.reports.scheduled });
}

export function useCreateSchedule() {
  const invalidate = useScheduleInvalidate();
  return useMutation({
    mutationFn: (payload: ScheduledReportInput) =>
      api.post<ScheduledReport>('/scheduled-reports', payload),
    onSuccess: invalidate,
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  const invalidate = useScheduleInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<ScheduledReportInput>;
    }) => api.patch<ScheduledReport>(`/scheduled-reports/${id}`, payload),
    onSuccess: (report, { id }) => {
      qc.setQueryData(queryKeys.reports.schedule(id), report);
      invalidate();
    },
  });
}

export function useDeleteSchedule() {
  const invalidate = useScheduleInvalidate();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => api.delete(`/scheduled-reports/${id}`),
    onSuccess: invalidate,
  });
}

/**
 * Export a report as CSV. The endpoint streams the file synchronously, so it
 * is fetched as an authenticated blob (bearer token) and saved via an object
 * URL. Returns the resolved filename for the export-history record.
 */
export function useExportReport() {
  return useMutation({
    mutationFn: async ({
      key,
      filters,
    }: {
      key: string;
      filters: ReportFilters;
      title?: string;
    }): Promise<{ filename: string }> => {
      const res = await http.get(`/reports/${key}/export`, {
        params: { ...toParams(filters), format: 'csv' },
        responseType: 'blob',
      });
      // Prefer the server filename from Content-Disposition; fall back to key.
      const disposition = String(res.headers['content-disposition'] ?? '');
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `${key.replace(/\./g, '-')}.csv`;

      const objectUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
      return { filename };
    },
  });
}
