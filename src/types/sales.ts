/* ------------------------------------------------------------------ *
 * Sales domain types — mirror the Laravel Sales resources/enums.
 * (app/Domains/Sales/Http/Resources/*, Models, Enums)
 * ------------------------------------------------------------------ */
export type LeadType = 'retail' | 'ib';

export interface LeadStatusRef {
  id: number;
  name: string;
}

export interface LeadOwnerRef {
  id: number;
  name: string;
}

export interface Client {
  id: number;
  /** null for contact-only clients (no originating lead). */
  lead_id: number | null;
  client_code: string | null;
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  display_name?: string | null;
  /** True for clients created directly, not via lead conversion. */
  is_contact_only?: boolean;
  kyc_verified?: boolean;
  status: 'active' | 'inactive';
  country_id: number | null;
  currency_id: number | null;
  preferred_language_id: number | null;
  converted_by: number | null;
  converted_at: string | null;
}

export interface Lead {
  id: number;
  name: string;
  first_name: string;
  last_name: string | null;
  middle_name: string | null;
  chinese_name: string | null;
  email: string | null;
  secondary_email: string | null;
  mobile: string | null;
  secondary_mobile: string | null;
  type: LeadType | null;
  country_id: number | null;
  preferred_language_id: number | null;
  status_id: number | null;
  status?: LeadStatusRef | null;
  last_tracked_at: string | null;
  is_converted: boolean;
  converted_at: string | null;
  owner_id: number | null;
  owner?: LeadOwnerRef | null;
  owner_color: string | null;
  sales_id: string | null;
  assigned_at: string | null;
  reassign_count: number;
  site_source: string | null;
  is_abandoned: boolean;
  abandoned_reason: string | null;
  is_blacklisted: boolean;
  campaign_source_id: number | null;
  campaign_source?: { id: number; name: string } | null;
  campaign_medium_id: number | null;
  campaign_medium?: { id: number; name: string } | null;
  campaign_name: string | null;
  campaign_term: string | null;
  campaign_content: string | null;
  campaign_url: string | null;
  manual_source_update: boolean;
  note: string | null;
  client?: Client | null;
  /** The lead's canonical Application (draft at creation → submitted later). */
  application?: {
    id: number;
    reference: string;
    status: string | null;
    is_draft: boolean;
  } | null;
  tags?: Tag[];
  created_at: string | null;
  updated_at: string | null;
}

export interface LeadStatus {
  id: number;
  name: string;
  name_cn: string | null;
  color: string | null;
  sort_order: number;
  requires_callback: boolean;
  is_won: boolean;
  is_lost: boolean;
  is_active: boolean;
  reasons?: LeadStatusReason[];
}

export interface LeadStatusReason {
  id: number;
  lead_status_id: number;
  name: string;
  name_cn: string | null;
  is_active: boolean;
}

export interface LeadNote {
  id: number;
  lead_id: number;
  body: string;
  created_by: number | null;
  created_at: string | null;
}

export interface Tag {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  is_public: boolean;
  created_by: number | null;
}

export type LeadActivityType =
  | 'created'
  | 'updated'
  | 'assigned'
  | 'reassigned'
  | 'released'
  | 'status_changed'
  | 'note_added'
  | 'tag_added'
  | 'tag_removed'
  | 'converted'
  | 'abandoned'
  | 'recovered'
  | 'blacklisted'
  | 'unblacklisted'
  | 'followup_scheduled';

export interface LeadActivity {
  id: number;
  lead_id: number;
  user_id: number | null;
  type: LeadActivityType | string;
  description: string | null;
  properties: Record<string, unknown> | null;
  created_at: string | null;
}

export interface LeadStatusHistory {
  id: number;
  lead_id: number;
  user_id: number | null;
  lead_status_id: number | null;
  reason_id: number | null;
  comment: string | null;
  call_again_at: string | null;
  mention_id: number | null;
  created_at: string | null;
}

export type MentionType = 'followup' | 'private';

export interface Mention {
  id: number;
  lead_id: number | null;
  title: string;
  type: MentionType | string;
  remind_at: string | null;
  mentioned_user_id: number | null;
  created_by: number | null;
  is_read: boolean;
  is_processed: boolean;
  processed_at: string | null;
  created_at: string | null;
}

export interface CampaignSource {
  id: number;
  name: string;
  code?: string | null;
  is_active: boolean;
}

export interface AssignableUser {
  id: number;
  name: string;
  email?: string;
  level?: number;
  level_label?: string | null;
  avatar_path?: string | null;
  /** The user's assigned owner colour(s); colors[0] is the assignment default. */
  colors?: string[];
}

/** Filter state for the lead list (also persisted as saved views). */
export interface LeadFilters {
  search?: string;
  status_id?: number | null;
  owner_id?: number | null;
  campaign_source_id?: number | null;
  type?: LeadType | null;
  is_blacklisted?: boolean | null;
  is_converted?: boolean | null;
}

export type LeadScope = 'mine' | 'unassigned' | 'pool';
