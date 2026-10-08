import { computed } from 'vue';
import { useQuery, useQueryClient, useMutation } from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import type {
  AssignableUser,
  CampaignSource,
  LeadStatus,
  Tag,
} from '@/types/sales';

/* ------------------------------------------------------------------ *
 * Reference data for the Sales workspace — statuses (the pipeline),
 * campaign sources, tags and assignable users. Long-cached.
 * ------------------------------------------------------------------ */
export function useLeadStatuses() {
  const auth = useAuthStore();
  const query = useQuery({
    queryKey: queryKeys.sales.statuses,
    enabled: computed(() => auth.can('leads.view')),
    staleTime: 10 * 60_000,
    queryFn: () =>
      api
        .get<LeadStatus[]>('/lead-statuses', { active: true })
        .then((rows) =>
          [...rows].sort((a, b) => a.sort_order - b.sort_order),
        ),
  });

  // id → status map for quick colour/label lookups in tables & badges.
  const byId = computed(() => {
    const map = new Map<number, LeadStatus>();
    (query.data.value ?? []).forEach((s) => map.set(s.id, s));
    return map;
  });

  return { ...query, byId };
}

export function useCampaignSources() {
  const auth = useAuthStore();
  return useQuery({
    queryKey: queryKeys.sales.campaignSources,
    enabled: computed(() => auth.can('leads.view')),
    staleTime: 10 * 60_000,
    queryFn: () => api.get<CampaignSource[]>('/campaign-sources'),
  });
}

export function useTags() {
  return useQuery({
    queryKey: queryKeys.sales.tags,
    staleTime: 5 * 60_000,
    queryFn: () => api.get<Tag[]>('/tags'),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; color?: string; is_public?: boolean }) =>
      api.post<Tag>('/tags', body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.sales.tags }),
  });
}

/**
 * Assignable users for the lead owner picker. Sources the dedicated
 * `/leads/assignable-users` endpoint, which returns the active sales staff
 * (levels 4-6) the actor may see by hierarchy visibility — NOT the org
 * `head_id` subtree (which is empty for a Tech Admin and left the picker blank).
 */
export function useAssignableUsers() {
  const auth = useAuthStore();
  return useQuery({
    queryKey: queryKeys.sales.assignableUsers,
    enabled: computed(() => auth.canAny(['leads.assign', 'leads.view'])),
    staleTime: 5 * 60_000,
    queryFn: () => api.get<AssignableUser[]>('/leads/assignable-users'),
  });
}
