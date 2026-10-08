import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import type { Paginated } from '@/types';
import type {
  Lead,
  LeadActivity,
  LeadNote,
  LeadScope,
  LeadStatusHistory,
} from '@/types/sales';

/* ------------------------------------------------------------------ *
 * Lead query + mutation layer.
 *
 * Lists are server-paginated and keyed by (scope, params) so filter/
 * page/sort changes refetch with the previous page kept on screen.
 * Mutations optimistically update the open detail where it is safe and
 * always invalidate the affected list + detail keys.
 * ------------------------------------------------------------------ */
const SCOPE_PATH: Record<LeadScope, string> = {
  mine: '/leads',
  unassigned: '/leads/unassigned',
  pool: '/leads/pool',
};

export function useLeadsList(
  scope: MaybeRefOrGetter<LeadScope>,
  params: MaybeRefOrGetter<Record<string, unknown>>,
) {
  const auth = useAuthStore();
  return useQuery({
    queryKey: computed(() =>
      queryKeys.leads.list(toValue(scope), toValue(params)),
    ),
    enabled: computed(() => auth.can('leads.view')),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: () =>
      api.get<Paginated<Lead>>(SCOPE_PATH[toValue(scope)], toValue(params)),
  });
}

export function useLead(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.leads.detail(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    staleTime: 30_000,
    queryFn: () => api.get<Lead>(`/leads/${toValue(id)}`),
  });
}

export function useLeadNotes(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.leads.notes(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    queryFn: () => api.get<LeadNote[]>(`/leads/${toValue(id)}/notes`),
  });
}

export function useLeadTrackHistory(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.leads.trackHistory(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    queryFn: () =>
      api.get<LeadStatusHistory[]>(`/leads/${toValue(id)}/track`),
  });
}

/** Paginated activity timeline; `page` is reactive for infinite loading. */
export function useLeadTimeline(
  id: MaybeRefOrGetter<number | null>,
  page: MaybeRefOrGetter<number>,
) {
  return useQuery({
    queryKey: computed(() => [
      ...queryKeys.leads.timeline(toValue(id) ?? 0),
      toValue(page),
    ]),
    enabled: computed(() => !!toValue(id)),
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.get<Paginated<LeadActivity>>(`/leads/${toValue(id)}/timeline`, {
        page: toValue(page),
        page_size: 25,
      }),
  });
}

/* --------------------------------- mutations --------------------------------- */
function useInvalidator() {
  const qc = useQueryClient();
  return {
    qc,
    lists: () => qc.invalidateQueries({ queryKey: ['leads', 'list'] }),
    detail: (id: number) =>
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(id) }),
    timeline: (id: number) =>
      qc.invalidateQueries({ queryKey: queryKeys.leads.timeline(id) }),
  };
}

export function useCreateLead() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<Lead>('/leads', body),
    onSuccess: () => inv.lists(),
  });
}

export function useUpdateLead() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.patch<Lead>(`/leads/${id}`, body),
    onSuccess: (lead) => {
      inv.qc.setQueryData(queryKeys.leads.detail(lead.id), lead);
      inv.lists();
    },
  });
}

export function useDeleteLead() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/leads/${id}`),
    onSuccess: () => inv.lists(),
  });
}

export function useAssignLead() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.post<Lead>(`/leads/${id}/assign`, body),
    onSuccess: (lead) => {
      inv.qc.setQueryData(queryKeys.leads.detail(lead.id), lead);
      inv.lists();
      inv.timeline(lead.id);
    },
  });
}

export function useBulkAssign() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: (body: {
      lead_ids: number[];
      assigned_to: number;
      reason?: string;
      /** Required by the API for sales-staff (level >= 4) assignees. */
      color?: string;
    }) => api.post<{ assigned: number[] }>('/leads/assign-bulk', body),
    onSuccess: () => inv.lists(),
  });
}

export function useTrackLead() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: {
        status_id: number;
        reason_id?: number | null;
        comment?: string;
        call_again_at?: string | null;
      };
    }) => api.post<LeadStatusHistory>(`/leads/${id}/track`, body),
    // Optimistically reflect the new status on the open detail.
    onMutate: async ({ id, body }) => {
      await inv.qc.cancelQueries({ queryKey: queryKeys.leads.detail(id) });
      const prev = inv.qc.getQueryData<Lead>(queryKeys.leads.detail(id));
      if (prev) {
        inv.qc.setQueryData<Lead>(queryKeys.leads.detail(id), {
          ...prev,
          status_id: body.status_id,
        });
      }
      return { prev, id };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        inv.qc.setQueryData(queryKeys.leads.detail(ctx.id), ctx.prev);
      }
    },
    onSettled: (_d, _e, { id }) => {
      inv.detail(id);
      inv.timeline(id);
      inv.qc.invalidateQueries({ queryKey: queryKeys.leads.trackHistory(id) });
      inv.lists();
    },
  });
}

export function useLeadFlag() {
  const inv = useInvalidator();
  const run = (
    action: 'abandon' | 'recover' | 'blacklist',
    id: number,
    body?: Record<string, unknown>,
  ) => api.post<Lead>(`/leads/${id}/${action}`, body);

  return useMutation({
    mutationFn: ({
      action,
      id,
      body,
    }: {
      action: 'abandon' | 'recover' | 'blacklist';
      id: number;
      body?: Record<string, unknown>;
    }) => run(action, id, body),
    onSuccess: (lead) => {
      inv.qc.setQueryData(queryKeys.leads.detail(lead.id), lead);
      inv.lists();
      inv.timeline(lead.id);
    },
  });
}

export function useConvertLead() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.post(`/leads/${id}/convert`, body),
    onSuccess: (_d, { id }) => {
      inv.detail(id);
      inv.lists();
      inv.timeline(id);
    },
  });
}

export function useAddNote() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) =>
      api.post<LeadNote>(`/leads/${id}/notes`, { body }),
    onSuccess: (_d, { id }) => {
      inv.qc.invalidateQueries({ queryKey: queryKeys.leads.notes(id) });
      inv.timeline(id);
    },
  });
}

export function useDeleteNote() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: ({ id, noteId }: { id: number; noteId: number }) =>
      api.delete(`/leads/${id}/notes/${noteId}`),
    onSuccess: (_d, { id }) =>
      inv.qc.invalidateQueries({ queryKey: queryKeys.leads.notes(id) }),
  });
}

export function useAttachTag() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: ({ id, tagId }: { id: number; tagId: number }) =>
      api.post<Lead>(`/leads/${id}/tags`, { tag_id: tagId }),
    onSuccess: (lead) =>
      inv.qc.setQueryData(queryKeys.leads.detail(lead.id), lead),
  });
}

export function useDetachTag() {
  const inv = useInvalidator();
  return useMutation({
    mutationFn: ({ id, tagId }: { id: number; tagId: number }) =>
      api.delete(`/leads/${id}/tags/${tagId}`),
    onSuccess: (_d, { id }) => inv.detail(id),
  });
}
