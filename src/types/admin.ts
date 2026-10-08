/* ------------------------------------------------------------------ *
 * Administration & Configuration types — mirror the Laravel API
 * contract for the Sprint 9 admin workspace (Identity + Platform
 * reference data + settings). snake_case keys match the JSON resources.
 * ------------------------------------------------------------------ */

/* ------------------------------- Identity ------------------------------ */

export interface AdminUser {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  level: number;
  level_label: string | null;
  /** Sales type: 0 Regular · 1 Sub · 2 IB (null for non-sales). Integer per API. */
  user_type: number | null;
  status: string | null;
  head_id: number | null;
  business_unit_id: number | null;
  zone_unit_id: number | null;
  country_id: number | null;
  zone_id: number | null;
  colors: string[];
  sales_id: string | null;
  avatar_path: string | null;
  is_online: boolean;
  joining_date: string | null;
  last_login_at: string | null;
  roles?: string[];
  created_at: string | null;
  updated_at: string | null;
}

/** Payload for POST /users and PATCH /users/{id}. */
export interface UserFormPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  level: number;
  user_type?: number | null;
  status?: string;
  head_id?: number | null;
  business_unit_id?: number | null;
  sales_id?: string | null;
  password?: string;
  password_confirmation?: string;
  roles?: string[];
}

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  permissions?: string[];
  created_at?: string | null;
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  is_member: boolean;
  is_supervisor: boolean;
  allow_release_notice: boolean;
  allow_manage_notice: boolean;
}

export interface Team {
  id: number;
  name: string;
  name_en: string | null;
  description: string | null;
  is_system: boolean;
  is_disabled: boolean;
  members?: TeamMember[];
}

export interface TeamMemberInput {
  user_id: number;
  is_member?: boolean;
  is_supervisor?: boolean;
  allow_release_notice?: boolean;
  allow_manage_notice?: boolean;
}

export interface BusinessUnit {
  id: number;
  name: string;
  zone_units?: { id: number; name: string }[];
}

/* --------------------------- Platform reference ------------------------ */

export interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string | null;
  phone_code: string | null;
  is_active: boolean;
}

export interface Zone {
  id: number;
  country_id: number;
  name: string;
  code: string | null;
  is_active: boolean;
}

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  decimal_places: number;
  is_active: boolean;
}

export interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string | null;
  is_rtl: boolean;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface OptionModule {
  id: number;
  parent_id: number | null;
  key: string;
  name_en: string;
  name_cn: string | null;
  is_configurable: boolean;
  is_active: boolean;
  sort_order: number;
  options?: OptionItem[];
  children?: OptionModule[];
}

export interface OptionItem {
  id: number;
  option_module_id: number;
  key: string;
  name_en: string;
  name_cn: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

export type SettingType = 'string' | 'integer' | 'boolean' | 'float' | 'json';

export interface Setting {
  key: string;
  value: unknown;
  type: SettingType;
  group: string;
  description: string | null;
  is_public: boolean;
}

/** The level whose users are Sales Agents — the backend requires a sales type
 * (`user_type`) for this level only (StoreUserRequest::withValidator →
 * VisibilityLevel::SalesAgent). */
export const SALES_AGENT_LEVEL = 6;

/** Sales type (legacy `user_type`) — App\Domains\Identity\Enums\UserType. */
export const USER_TYPES: { value: number; label: string }[] = [
  { value: 0, label: 'Regular' },
  { value: 1, label: 'Sub' },
  { value: 2, label: 'IB' },
];

/**
 * Owner-colour palette. The backend has no colour enum — `users.colors` and
 * `leads.owner_color` are free strings (≤32 chars; legacy serialized
 * `user_color`). This fixed hex palette is the UI source for picking a sales
 * user's colour (Create/Edit User) and the lead owner colour at assignment.
 */
export const USER_COLORS: { value: string; label: string }[] = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#64748b', label: 'Slate' },
];

/** Staff levels 1 (most privileged) → 6 (sales agent). */
export const USER_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: 'L1 · Tech Admin' },
  { value: 2, label: 'L2 · Admin' },
  { value: 3, label: 'L3 · Head' },
  { value: 4, label: 'L4 · Manager' },
  { value: 5, label: 'L5 · Senior' },
  { value: 6, label: 'L6 · Agent' },
];
