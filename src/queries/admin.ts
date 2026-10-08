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
  AdminUser,
  BusinessUnit,
  Permission,
  Role,
  Team,
  TeamMemberInput,
  UserFormPayload,
} from '@/types/admin';

/* ------------------------------------------------------------------ *
 * Identity / administration query + mutation layer (Users, Roles,
 * Teams). Reads are gated behind the matching view permission; writes
 * behind their granular permission (the server still enforces via
 * policies). Mutations invalidate the precise affected keys so two
 * admins editing the same record stay consistent.
 * ------------------------------------------------------------------ */
function gate(perm: string) {
  const auth = useAuthStore();
  return computed(() => auth.can(perm));
}

function gateAny(perms: string[]) {
  const auth = useAuthStore();
  return computed(() => auth.canAny(perms));
}

/* -------------------------------- Users ------------------------------- */

export function useUsers(params: MaybeRefOrGetter<Record<string, unknown>>) {
  return useQuery({
    queryKey: computed(() => queryKeys.admin.users(toValue(params))),
    enabled: gate('users.view'),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: () => api.get<Paginated<AdminUser>>('/users', toValue(params)),
  });
}

function useUsersInvalidate() {
  const qc = useQueryClient();
  return {
    qc,
    lists: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    user: (id: number) =>
      qc.invalidateQueries({ queryKey: queryKeys.admin.user(id) }),
  };
}

export function useCreateUser() {
  const inv = useUsersInvalidate();
  return useMutation({
    mutationFn: (payload: UserFormPayload) =>
      api.post<AdminUser>('/users', payload),
    onSuccess: () => inv.lists(),
  });
}

export function useUpdateUser() {
  const inv = useUsersInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<UserFormPayload> }) =>
      api.patch<AdminUser>(`/users/${id}`, payload),
    onSuccess: (user, { id }) => {
      inv.qc.setQueryData(queryKeys.admin.user(id), user);
      inv.lists();
    },
  });
}

export function useDeleteUser() {
  const inv = useUsersInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/users/${id}`),
    onSuccess: () => inv.lists(),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.post<{ ok: true }>(`/users/${id}/reset-password`, {
        password,
        password_confirmation: password,
      }),
  });
}

export function useSyncUserRoles() {
  const inv = useUsersInvalidate();
  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: string[] }) =>
      api.put<AdminUser>(`/users/${id}/roles`, { roles }),
    onSuccess: (user, { id }) => {
      inv.qc.setQueryData(queryKeys.admin.user(id), user);
      inv.lists();
    },
  });
}

/* -------------------------------- Roles ------------------------------- */

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.admin.roles,
    enabled: gateAny(['roles.view', 'roles.manage', 'roles.assign', 'users.view']),
    staleTime: 60_000,
    queryFn: () => api.get<Role[]>('/roles'),
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: queryKeys.admin.permissions,
    enabled: gateAny(['roles.view', 'roles.manage']),
    staleTime: 10 * 60_000,
    queryFn: () => api.get<Permission[]>('/permissions'),
  });
}

function useRolesInvalidate() {
  const qc = useQueryClient();
  return {
    qc,
    all: () => qc.invalidateQueries({ queryKey: queryKeys.admin.roles }),
  };
}

export function useCreateRole() {
  const inv = useRolesInvalidate();
  return useMutation({
    mutationFn: (payload: { name: string; permissions?: string[] }) =>
      api.post<Role>('/roles', payload),
    onSuccess: () => inv.all(),
  });
}

export function useUpdateRole() {
  const inv = useRolesInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { name?: string; permissions?: string[] };
    }) => api.patch<Role>(`/roles/${id}`, payload),
    onSuccess: () => inv.all(),
  });
}

export function useDeleteRole() {
  const inv = useRolesInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/roles/${id}`),
    // Optimistic: drop the row immediately, roll back on failure.
    onMutate: async (id: number) => {
      await inv.qc.cancelQueries({ queryKey: queryKeys.admin.roles });
      const prev = inv.qc.getQueryData<Role[]>(queryKeys.admin.roles);
      inv.qc.setQueryData<Role[]>(queryKeys.admin.roles, (old) =>
        (old ?? []).filter((r) => r.id !== id),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) inv.qc.setQueryData(queryKeys.admin.roles, ctx.prev);
    },
    onSettled: () => inv.all(),
  });
}

/* -------------------------------- Teams ------------------------------- */

export function useTeams() {
  return useQuery({
    queryKey: queryKeys.admin.teams,
    enabled: gateAny(['teams.view', 'teams.manage']),
    staleTime: 30_000,
    queryFn: () => api.get<Team[]>('/teams'),
  });
}

export function useTeam(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.admin.team(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    staleTime: 20_000,
    queryFn: () => api.get<Team>(`/teams/${toValue(id)}`),
  });
}

function useTeamsInvalidate() {
  const qc = useQueryClient();
  return {
    qc,
    all: () => qc.invalidateQueries({ queryKey: queryKeys.admin.teams }),
    team: (id: number) =>
      qc.invalidateQueries({ queryKey: queryKeys.admin.team(id) }),
  };
}

export function useCreateTeam() {
  const inv = useTeamsInvalidate();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      name_en?: string | null;
      description?: string | null;
    }) => api.post<Team>('/teams', payload),
    onSuccess: () => inv.all(),
  });
}

export function useUpdateTeam() {
  const inv = useTeamsInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        name?: string;
        name_en?: string | null;
        description?: string | null;
        is_disabled?: boolean;
      };
    }) => api.patch<Team>(`/teams/${id}`, payload),
    onSuccess: (team, { id }) => {
      inv.qc.setQueryData(queryKeys.admin.team(id), team);
      inv.all();
    },
  });
}

export function useDeleteTeam() {
  const inv = useTeamsInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/teams/${id}`),
    onSuccess: () => inv.all(),
  });
}

export function useSyncTeamMembers() {
  const inv = useTeamsInvalidate();
  return useMutation({
    mutationFn: ({ id, members }: { id: number; members: TeamMemberInput[] }) =>
      api.put<Team>(`/teams/${id}/members`, { members }),
    onSuccess: (team, { id }) => {
      inv.qc.setQueryData(queryKeys.admin.team(id), team);
      inv.all();
    },
  });
}

/* ----------------------------- Hierarchy ------------------------------ */

/** Business units (with nested zone units) — superior/unit pickers. */
export function useBusinessUnits() {
  return useQuery({
    queryKey: queryKeys.admin.businessUnits,
    enabled: gateAny(['users.view', 'users.create', 'users.update']),
    staleTime: 10 * 60_000,
    queryFn: () => api.get<BusinessUnit[]>('/hierarchy/business-units'),
  });
}
