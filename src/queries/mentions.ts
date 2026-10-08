import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import type { Mention } from '@/types/sales';

/* Mentions / follow-up reminders — the personal queue. */
export function useMentions(includeProcessed: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: computed(() => queryKeys.mentions(toValue(includeProcessed))),
    staleTime: 20_000,
    queryFn: () =>
      api.get<Mention[]>('/mentions', {
        include_processed: toValue(includeProcessed),
      }),
  });
}

function useMentionInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['mentions'] });
}

export function useCreateMention() {
  const invalidate = useMentionInvalidate();
  return useMutation({
    mutationFn: (body: {
      title: string;
      remind_at?: string | null;
      mentioned_user_id?: number | null;
      lead_id?: number | null;
    }) => api.post<Mention>('/mentions', body),
    onSuccess: invalidate,
  });
}

export function useMentionAction() {
  const invalidate = useMentionInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: number;
      action: 'processed' | 'unprocessed' | 'read';
    }) => api.post<Mention>(`/mentions/${id}/${action}`),
    onSuccess: invalidate,
  });
}

export function useDeleteMention() {
  const invalidate = useMentionInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/mentions/${id}`),
    onSuccess: invalidate,
  });
}
