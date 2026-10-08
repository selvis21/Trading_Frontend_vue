/* ------------------------------------------------------------------ *
 * Compliance / KYC domain types — mirror app/Domains/Compliance/*.
 * Note: the compliance API identifies clients by client_id only (no
 * client-name endpoint), so the UI labels clients by id + client_code
 * where available.
 * ------------------------------------------------------------------ */
export type KycApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type KycProfileStatus =
  | 'not_started'
  | 'in_progress'
  | 'verified'
  | 'rejected'
  | 'na';

export type KycStatus =
  | 'not_verified'
  | 'rejected'
  | 'pending'
  | 'verified'
  | 'na';

/** Jumio auto-verification lifecycle (additive; null when the integration is off). */
export type DocumentVerificationStatus =
  | 'uploaded'
  | 'submitted_to_jumio'
  | 'auto_verified'
  | 'manual_review_required'
  | 'rejected';

export type DocumentCategory = 'identity' | 'address' | 'other';
export type KycDataSource = 'agent' | 'website' | 'portal' | 'app' | 'jumio';

export interface KycDocumentType {
  id: number;
  parent_id: number | null;
  name: string;
  name_cn: string | null;
  code: string | null;
  category: DocumentCategory | null;
  requires_id_number: boolean;
  requires_expiry: boolean;
  is_active: boolean;
  sort_order: number;
  children?: KycDocumentType[];
}

export interface KycDocument {
  id: number;
  client_id: number;
  kyc_application_id: number | null;
  kyc_document_type_id: number;
  type?: { id: number; name: string; category: DocumentCategory | null } | null;
  status: KycStatus | null;
  verification_status?: DocumentVerificationStatus | null;
  verification_checked_at?: string | null;
  data_source: KycDataSource | null;
  file_name: string;
  mime_type: string;
  file_size: number;
  id_number: string | null;
  expiry_date: string | null;
  comment: string | null;
  uploaded_by: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string | null;
}

export interface KycStatusHistory {
  id: number;
  client_id: number;
  kyc_application_id: number | null;
  kyc_document_id: number | null;
  scope: 'application' | 'document';
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  changed_by: number | null;
  created_at: string | null;
}

export interface KycApplication {
  id: number;
  client_id: number;
  kyc_profile_id: number;
  attempt: number;
  status: KycApplicationStatus | null;
  submitted_at: string | null;
  submitted_by: number | null;
  reviewed_at: string | null;
  reviewed_by: number | null;
  decision_reason: string | null;
  documents?: KycDocument[];
  status_histories?: KycStatusHistory[];
  created_at: string | null;
}

export interface KycProfile {
  id: number;
  client_id: number;
  status: KycProfileStatus | null;
  risk_level: string | null;
  identity_verified: boolean;
  address_verified: boolean;
  verified_at: string | null;
  verified_by: number | null;
  applications?: KycApplication[];
  created_at: string | null;
}

export interface ComplianceActivity {
  id: number;
  client_id: number;
  kyc_application_id: number | null;
  user_id: number | null;
  type: string;
  description: string | null;
  properties: Record<string, unknown> | null;
  created_at: string | null;
}

export interface ComplianceNote {
  id: number;
  client_id: number;
  kyc_application_id: number | null;
  body: string;
  created_by: number | null;
  created_at: string | null;
}

export interface ComplianceMetrics {
  profiles_by_status: Record<KycProfileStatus, number>;
  identity_verified: number;
  address_verified: number;
}

/** Queue tabs → the application status they filter to. */
export type QueueView =
  | 'draft'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'all';

export const QUEUE_STATUS: Record<QueueView, KycApplicationStatus | undefined> = {
  draft: 'draft',
  pending: 'submitted',
  in_review: 'under_review',
  approved: 'approved',
  rejected: 'rejected',
  all: undefined,
};
