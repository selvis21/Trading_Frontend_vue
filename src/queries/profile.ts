import { computed } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import type { AuthUser, Locale, MePayload } from '@/types';

/* ------------------------------------------------------------------ *
 * Profile & server-side preferences.
 *
 * The backend persists only `theme` (light|dark) + `locale` (and legacy
 * colour/column/layout blobs). Density and notification preferences are
 * client-only (see ui / notifications stores). This layer keeps the
 * server preferences cache and the UI store in sync.
 * ------------------------------------------------------------------ */
export interface ServerPreferences {
  theme: 'light' | 'dark';
  locale: Locale;
  background_color: string | null;
  text_color: string | null;
  table_columns: Record<string, unknown>;
  dashboard_layout: Record<string, unknown>;
}

export function usePreferencesQuery() {
  const auth = useAuthStore();
  const ui = useUiStore();

  return useQuery({
    queryKey: queryKeys.preferences,
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { preferences } = await api.get<{ preferences: ServerPreferences }>(
        '/profile/preferences',
      );
      // Seed the live UI from the server (cross-device persistence). The
      // user's explicit local 'system' choice is preserved — we only adopt
      // the server's concrete theme when the local value isn't 'system'.
      if (ui.theme !== 'system') ui.setTheme(preferences.theme);
      ui.locale = preferences.locale;
      return preferences;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const auth = useAuthStore();

  return useMutation({
    mutationFn: (body: Partial<Pick<AuthUser, 'first_name' | 'last_name' | 'phone' | 'email'>>) =>
      api.patch<AuthUser>('/profile', body),
    onSuccess: (user) => {
      auth.user = user;
      // Keep the me-cache coherent without a full refetch.
      qc.setQueryData<MePayload>(queryKeys.me, (prev) =>
        prev ? { ...prev, user } : prev,
      );
    },
  });
}

export function useChangePassword() {
  const auth = useAuthStore();
  return useMutation({
    mutationFn: (body: {
      current_password: string;
      password: string;
      password_confirmation: string;
    }) => api.post('/profile/password', body),
    onSuccess: () => {
      auth.mustUpdatePassword = false;
    },
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  const ui = useUiStore();

  return useMutation({
    mutationFn: (changes: Partial<ServerPreferences>) =>
      api
        .put<{ preferences: ServerPreferences }>('/profile/preferences', changes)
        .then((r) => r),
    onSuccess: ({ preferences }) => {
      qc.setQueryData(queryKeys.preferences, preferences);
      if (ui.theme !== 'system') ui.setTheme(preferences.theme);
      ui.locale = preferences.locale;
    },
  });
}
