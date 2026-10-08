import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import type {
  Country,
  Currency,
  Language,
  OptionItem,
  OptionModule,
  Setting,
  Zone,
} from '@/types/admin';

/* ------------------------------------------------------------------ *
 * Platform reference-data query + mutation layer. Reference reads are
 * open to any authenticated user (they feed dropdowns app-wide); writes
 * are gated behind `reference.manage` / `options.manage` / `settings.*`.
 * All list endpoints return plain arrays (no server pagination), so the
 * pages paginate/search client-side.
 * ------------------------------------------------------------------ */
function authed() {
  const auth = useAuthStore();
  return computed(() => auth.isAuthenticated);
}

/* ------------------------------ Countries ----------------------------- */

export function useCountries(
  params: MaybeRefOrGetter<Record<string, unknown>> = () => ({}),
) {
  return useQuery({
    queryKey: computed(() => queryKeys.reference.countries(toValue(params))),
    enabled: authed(),
    staleTime: 5 * 60_000,
    queryFn: () => api.get<Country[]>('/countries', toValue(params)),
  });
}

export function useCreateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Country>) =>
      api.post<Country>('/countries', payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['reference', 'countries'] }),
  });
}

export function useUpdateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Country> }) =>
      api.patch<Country>(`/countries/${id}`, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['reference', 'countries'] }),
  });
}

export function useDeleteCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/countries/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['reference', 'countries'] }),
  });
}

/* -------------------------------- Zones ------------------------------- */

export function useZones(
  params: MaybeRefOrGetter<Record<string, unknown>> = () => ({}),
) {
  return useQuery({
    queryKey: computed(() => queryKeys.reference.zones(toValue(params))),
    enabled: authed(),
    staleTime: 5 * 60_000,
    queryFn: () => api.get<Zone[]>('/zones', toValue(params)),
  });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Zone>) => api.post<Zone>('/zones', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reference', 'zones'] }),
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Zone> }) =>
      api.patch<Zone>(`/zones/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reference', 'zones'] }),
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/zones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reference', 'zones'] }),
  });
}

/* ------------------------------ Currencies ---------------------------- */

export function useCurrencies(
  params: MaybeRefOrGetter<Record<string, unknown>> = () => ({}),
) {
  return useQuery({
    queryKey: computed(() => queryKeys.reference.currencies(toValue(params))),
    enabled: authed(),
    staleTime: 5 * 60_000,
    queryFn: () => api.get<Currency[]>('/currencies', toValue(params)),
  });
}

export function useCreateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Currency>) =>
      api.post<Currency>('/currencies', payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['reference', 'currencies'] }),
  });
}

export function useUpdateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Currency> }) =>
      api.patch<Currency>(`/currencies/${id}`, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['reference', 'currencies'] }),
  });
}

export function useDeleteCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/currencies/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['reference', 'currencies'] }),
  });
}

/* ------------------------------ Languages ----------------------------- */

export function useLanguages(
  params: MaybeRefOrGetter<Record<string, unknown>> = () => ({}),
) {
  return useQuery({
    queryKey: computed(() => queryKeys.reference.languages(toValue(params))),
    enabled: authed(),
    staleTime: 5 * 60_000,
    queryFn: () => api.get<Language[]>('/languages', toValue(params)),
  });
}

export function useCreateLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Language>) =>
      api.post<Language>('/languages', payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['reference', 'languages'] }),
  });
}

export function useUpdateLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Language> }) =>
      api.patch<Language>(`/languages/${id}`, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['reference', 'languages'] }),
  });
}

export function useDeleteLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/languages/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['reference', 'languages'] }),
  });
}

/* --------------------------- Option modules --------------------------- */

export function useOptionModules() {
  return useQuery({
    queryKey: queryKeys.reference.optionModules,
    enabled: authed(),
    staleTime: 5 * 60_000,
    queryFn: () => api.get<OptionModule[]>('/option-modules'),
  });
}

export function useOptions(
  params: MaybeRefOrGetter<Record<string, unknown>> = () => ({}),
) {
  return useQuery({
    queryKey: computed(() => queryKeys.reference.options(toValue(params))),
    enabled: authed(),
    staleTime: 5 * 60_000,
    queryFn: () => api.get<OptionItem[]>('/options', toValue(params)),
  });
}

function useOptionsInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['reference', 'options'] });
    qc.invalidateQueries({ queryKey: queryKeys.reference.optionModules });
  };
}

export function useCreateOption() {
  const inv = useOptionsInvalidate();
  return useMutation({
    mutationFn: (payload: Partial<OptionItem>) =>
      api.post<OptionItem>('/options', payload),
    onSuccess: inv,
  });
}

export function useUpdateOption() {
  const inv = useOptionsInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<OptionItem> }) =>
      api.patch<OptionItem>(`/options/${id}`, payload),
    onSuccess: inv,
  });
}

export function useDeleteOption() {
  const inv = useOptionsInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/options/${id}`),
    onSuccess: inv,
  });
}

/* ------------------------------- Settings ----------------------------- */

export function useSettings(group?: MaybeRefOrGetter<string | undefined>) {
  const auth = useAuthStore();
  return useQuery({
    queryKey: computed(() => queryKeys.reference.settings(toValue(group))),
    enabled: computed(() => auth.can('settings.view')),
    staleTime: 60_000,
    queryFn: () =>
      api.get<Setting[]>(
        '/settings',
        toValue(group) ? { group: toValue(group) } : undefined,
      ),
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: string;
      payload: {
        value: unknown;
        type?: string;
        group?: string;
        description?: string | null;
        is_public?: boolean;
      };
    }) => api.put<Setting>(`/settings/${key}`, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['reference', 'settings'] }),
  });
}
