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
  ComplianceActivity,
  ComplianceMetrics,
  ComplianceNote,
  KycApplication,
  KycDocument,
  KycDocumentType,
  KycProfile,
  KycStatus,
  KycStatusHistory,
} from '@/types/compliance';

/* ------------------------------------------------------------------ *
 * Compliance / KYC query + mutation layer. Everything is gated behind
 * compliance.view; actions behind their granular permissions. Detail
 * queries are cached; the client timeline loads infinitely.
 * ------------------------------------------------------------------ */
function gate(perm: string) {
  const auth = useAuthStore();
  return computed(() => auth.can(perm));
}

export function useComplianceMetrics() {
  return useQuery({
    queryKey: queryKeys.compliance.metrics,
    enabled: gate('compliance.view'),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () => api.get<ComplianceMetrics>('/compliance/metrics'),
  });
}

export function useKycApplications(
  params: MaybeRefOrGetter<Record<string, unknown>>,
) {
  return useQuery({
    queryKey: computed(() => queryKeys.compliance.applications(toValue(params))),
    enabled: gate('compliance.view'),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: () => api.get<Paginated<KycApplication>>('/kyc-applications', toValue(params)),
  });
}

export function useKycApplication(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.compliance.application(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    staleTime: 20_000,
    queryFn: () => api.get<KycApplication>(`/kyc-applications/${toValue(id)}`),
  });
}

export function useKycApplicationHistory(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.compliance.applicationHistory(toValue(id) ?? 0),
    ),
    enabled: computed(() => !!toValue(id)),
    queryFn: () =>
      api.get<KycStatusHistory[]>(`/kyc-applications/${toValue(id)}/history`),
  });
}

export function useKycProfiles(
  params: MaybeRefOrGetter<Record<string, unknown>>,
) {
  return useQuery({
    queryKey: computed(() => queryKeys.compliance.profiles(toValue(params))),
    enabled: gate('compliance.view'),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: () => api.get<Paginated<KycProfile>>('/compliance/profiles', toValue(params)),
  });
}

export function useClientKyc(clientId: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.compliance.clientProfile(toValue(clientId) ?? 0),
    ),
    enabled: computed(() => !!toValue(clientId)),
    staleTime: 20_000,
    queryFn: () => api.get<KycProfile>(`/clients/${toValue(clientId)}/kyc`),
  });
}

export function useClientKycDocuments(clientId: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.compliance.clientDocuments(toValue(clientId) ?? 0),
    ),
    enabled: computed(() => !!toValue(clientId)),
    staleTime: 15_000,
    queryFn: () => api.get<KycDocument[]>(`/clients/${toValue(clientId)}/kyc/documents`),
  });
}

export function useClientKycTimeline(
  clientId: MaybeRefOrGetter<number | null>,
  page: MaybeRefOrGetter<number>,
) {
  return useQuery({
    queryKey: computed(() => [
      ...queryKeys.compliance.clientTimeline(toValue(clientId) ?? 0),
      toValue(page),
    ]),
    enabled: computed(() => !!toValue(clientId)),
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.get<Paginated<ComplianceActivity>>(
        `/clients/${toValue(clientId)}/kyc/timeline`,
        { page: toValue(page), page_size: 25 },
      ),
  });
}

export function useComplianceNotes(clientId: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.compliance.clientNotes(toValue(clientId) ?? 0),
    ),
    enabled: computed(() => !!toValue(clientId)),
    queryFn: () =>
      api.get<ComplianceNote[]>(`/clients/${toValue(clientId)}/compliance/notes`),
  });
}

export function useDocumentTypes() {
  return useQuery({
    queryKey: queryKeys.compliance.documentTypes,
    enabled: gate('compliance.view'),
    staleTime: 10 * 60_000,
    queryFn: () => api.get<KycDocumentType[]>('/kyc-document-types', { active: true }),
  });
}

/* ------------------------------- mutations ------------------------------- */
function useComplianceInvalidate() {
  const qc = useQueryClient();
  return {
    qc,
    all: () => qc.invalidateQueries({ queryKey: ['compliance'] }),
    application: (id: number) => {
      qc.invalidateQueries({ queryKey: queryKeys.compliance.application(id) });
      qc.invalidateQueries({ queryKey: ['compliance', 'applications'] });
      qc.invalidateQueries({ queryKey: queryKeys.compliance.applicationHistory(id) });
      qc.invalidateQueries({ queryKey: queryKeys.compliance.metrics });
    },
    client: (clientId: number) => {
      qc.invalidateQueries({ queryKey: ['compliance', 'client', clientId] });
      qc.invalidateQueries({ queryKey: queryKeys.compliance.metrics });
    },
  };
}

/** application transitions: review / approve / reject / submit. */
export function useApplicationTransition() {
  const inv = useComplianceInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: number;
      action: 'review' | 'approve' | 'reject' | 'submit';
      reason?: string;
      clientId?: number;
    }) =>
      api.post<KycApplication>(
        `/kyc-applications/${id}/${action}`,
        reason !== undefined ? { reason } : undefined,
      ),
    onSuccess: (app, { id, clientId }) => {
      inv.qc.setQueryData(queryKeys.compliance.application(id), app);
      inv.application(id);
      if (clientId) inv.client(clientId);
    },
  });
}

/** Open a fresh draft KYC application for a client (first cycle). The service
 * is idempotent — it returns the existing open application if one exists. */
export function useOpenApplication() {
  const inv = useComplianceInvalidate();
  return useMutation({
    mutationFn: ({ clientId }: { clientId: number }) =>
      api.post<KycApplication>(`/clients/${clientId}/kyc/applications`),
    onSuccess: (app, { clientId }) => {
      inv.qc.setQueryData(queryKeys.compliance.application(app.id), app);
      inv.application(app.id);
      inv.client(clientId);
    },
  });
}

/** Re-open a fresh application after a rejection (server requires the latest
 * application to be rejected; it increments the attempt). */
export function useResubmitApplication() {
  const inv = useComplianceInvalidate();
  return useMutation({
    mutationFn: ({ clientId }: { clientId: number }) =>
      api.post<KycApplication>(`/clients/${clientId}/kyc/resubmit`),
    onSuccess: (app, { clientId }) => {
      inv.qc.setQueryData(queryKeys.compliance.application(app.id), app);
      inv.application(app.id);
      inv.client(clientId);
    },
  });
}

export function useReviewDocument() {
  const inv = useComplianceInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: number;
      status: KycStatus;
      reason?: string;
      clientId?: number;
    }) => api.post<KycDocument>(`/kyc-documents/${id}/review`, { status, reason }),
    onSuccess: (_doc, { clientId }) => {
      if (clientId) inv.client(clientId);
      inv.qc.invalidateQueries({ queryKey: ['compliance', 'applications'] });
    },
  });
}

export function useAddComplianceNote() {
  const inv = useComplianceInvalidate();
  return useMutation({
    mutationFn: ({
      clientId,
      body,
      applicationId,
    }: {
      clientId: number;
      body: string;
      applicationId?: number;
    }) =>
      api.post<ComplianceNote>(`/clients/${clientId}/compliance/notes`, {
        body,
        kyc_application_id: applicationId,
      }),
    onSuccess: (_n, { clientId }) =>
      inv.qc.invalidateQueries({ queryKey: queryKeys.compliance.clientNotes(clientId) }),
  });
}

export function useDeleteComplianceNote() {
  const inv = useComplianceInvalidate();
  return useMutation({
    mutationFn: ({ noteId }: { noteId: number; clientId: number }) =>
      api.delete(`/compliance/notes/${noteId}`),
    onSuccess: (_d, { clientId }) =>
      inv.qc.invalidateQueries({ queryKey: queryKeys.compliance.clientNotes(clientId) }),
  });
}

export function useUploadDocument() {
  const inv = useComplianceInvalidate();
  return useMutation({
    mutationFn: ({ clientId, form }: { clientId: number; form: FormData }) =>
      api.raw
        .post(`/clients/${clientId}/kyc/documents`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data.data as KycDocument),
    onSuccess: (_d, { clientId }) => inv.client(clientId),
  });
}

/* ------------------------------------------------------------------ *
 * Document-type administration (Sprint 9). The management list returns
 * the full set (incl. inactive, optional category filter); writes are
 * gated behind compliance.doctypes.manage and invalidate every
 * document-type read (the active-only picker + the admin list).
 * ------------------------------------------------------------------ */
export function useManagedDocumentTypes(
  params: MaybeRefOrGetter<Record<string, unknown>> = () => ({}),
) {
  return useQuery({
    queryKey: computed(() => [
      ...queryKeys.compliance.documentTypes,
      toValue(params),
    ]),
    enabled: gate('compliance.view'),
    staleTime: 60_000,
    queryFn: () =>
      api.get<KycDocumentType[]>('/kyc-document-types', toValue(params)),
  });
}

function useDocTypeInvalidate() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({ queryKey: queryKeys.compliance.documentTypes });
}

export function useCreateDocumentType() {
  const inv = useDocTypeInvalidate();
  return useMutation({
    mutationFn: (payload: Partial<KycDocumentType>) =>
      api.post<KycDocumentType>('/kyc-document-types', payload),
    onSuccess: inv,
  });
}

export function useUpdateDocumentType() {
  const inv = useDocTypeInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<KycDocumentType> }) =>
      api.patch<KycDocumentType>(`/kyc-document-types/${id}`, payload),
    onSuccess: inv,
  });
}

export function useDeleteDocumentType() {
  const inv = useDocTypeInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/kyc-document-types/${id}`),
    onSuccess: inv,
  });
}
