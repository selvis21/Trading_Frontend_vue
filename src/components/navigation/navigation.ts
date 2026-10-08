import type { Component } from 'vue';
import {
  LayoutDashboard,
  Users,
  UserSquare,
  LineChart,
  ClipboardList,
  Wallet,
  ShieldCheck,
  FileBarChart,
  Settings2,
} from '@lucide/vue';

/* ------------------------------------------------------------------ *
 * Navigation model — the role-aligned IA from the architecture doc.
 * Each item declares the permission(s) that reveal it; the sidebar
 * filters against the auth store (server still enforces).
 * `anyOf` empty/undefined ⇒ always visible to an authenticated user.
 * ------------------------------------------------------------------ */
export interface NavChild {
  label: string;
  href: string;
  anyOf?: string[];
}

export interface NavSection {
  label: string;
  href: string;
  icon: Component;
  anyOf?: string[];
  children?: NavChild[];
}

export const navigation: NavSection[] = [
  {
    label: 'Home',
    href: '/',
    icon: LayoutDashboard,
    anyOf: ['dashboard.view'],
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: Users,
    anyOf: ['leads.view'],
    children: [
      { label: 'Inbox', href: '/leads/inbox', anyOf: ['leads.view'] },
      { label: 'My Leads', href: '/leads', anyOf: ['leads.view'] },
      { label: 'Pipeline', href: '/leads/pipeline', anyOf: ['leads.view'] },
      { label: 'Public Sea', href: '/leads/pool', anyOf: ['leads.view'] },
      // 'Import' (/leads/import) removed — the import wizard page is not yet
      // built, so the link 404'd (UAT Gate 0). Restore this child when the
      // Lead Import wizard ships. Mentions/follow-ups is a built page that was
      // missing from the nav; surfaced here.
      { label: 'Mentions', href: '/mentions', anyOf: ['leads.view'] },
    ],
  },
  {
    // The Clients page is served by the leads list endpoint (gated by
    // `leads.view`), so the menu is gated on the same permission — a menu item
    // must never lead to an Access-Denied page. Cross-domain client *read* for
    // Compliance / Payments / Trading Operations is a separate (PII) decision
    // tracked in the RBAC review report, not granted here.
    label: 'Clients',
    href: '/clients',
    icon: UserSquare,
    anyOf: ['leads.view'],
  },
  {
    // Applications — a SEPARATE business flow from Trading ▸ Open-Account
    // Requests. Surfaced as its own top-level section (not nested under
    // Trading) so an authorized operator can always find it: the CRM
    // reproduction of the public Website's Demo/Live application forms. The
    // section is visible to whoever may submit either application; each child
    // is gated on its own create permission.
    label: 'Applications',
    href: '/trading/applications',
    icon: ClipboardList,
    anyOf: [
      'trading.applications.demo.create',
      'trading.applications.live.create',
    ],
    children: [
      {
        label: 'Demo Application',
        href: '/trading/applications/demo',
        anyOf: ['trading.applications.demo.create'],
      },
      {
        label: 'Live Application',
        href: '/trading/applications/live',
        anyOf: ['trading.applications.live.create'],
      },
    ],
  },
  {
    label: 'Trading',
    href: '/trading/accounts',
    icon: LineChart,
    anyOf: ['trading.view'],
    children: [
      { label: 'Accounts', href: '/trading/accounts', anyOf: ['trading.view'] },
      { label: 'Workspace', href: '/trading/workspace', anyOf: ['trading.view'] },
      {
        label: 'Open-Account Requests',
        href: '/trading/requests',
        anyOf: ['trading.view'],
      },
      {
        label: 'Platforms',
        href: '/trading/platforms',
        anyOf: ['trading.platforms.manage'],
      },
      {
        label: 'Groups',
        href: '/trading/groups',
        anyOf: ['trading.groups.manage'],
      },
    ],
  },
  {
    label: 'Finance',
    href: '/finance/dashboard',
    icon: Wallet,
    anyOf: ['finance.view'],
    children: [
      { label: 'Dashboard', href: '/finance/dashboard', anyOf: ['finance.view'] },
      { label: 'Workspace', href: '/finance/workspace', anyOf: ['finance.view'] },
      { label: 'Deposits', href: '/finance/deposits', anyOf: ['finance.view'] },
      {
        label: 'Withdrawals',
        href: '/finance/withdrawals',
        anyOf: ['finance.view'],
      },
      {
        label: 'Transactions',
        href: '/finance/transactions',
        anyOf: ['finance.view'],
      },
      { label: 'Ledger', href: '/finance/ledger', anyOf: ['finance.view'] },
      {
        label: 'Payment Methods',
        href: '/finance/payment-methods',
        anyOf: ['finance.methods.manage'],
      },
    ],
  },
  {
    label: 'Compliance',
    href: '/compliance/queue',
    icon: ShieldCheck,
    anyOf: ['compliance.view'],
    children: [
      {
        label: 'KYC Queue',
        href: '/compliance/queue',
        anyOf: ['compliance.view'],
      },
      {
        label: 'Profiles',
        href: '/compliance/profiles',
        anyOf: ['compliance.view'],
      },
      {
        label: 'Document Types',
        href: '/compliance/document-types',
        anyOf: ['compliance.doctypes.manage'],
      },
    ],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: FileBarChart,
    anyOf: ['reports.view'],
    children: [
      { label: 'Catalogue', href: '/reports', anyOf: ['reports.view'] },
      { label: 'Analytics', href: '/reports/analytics', anyOf: ['reports.view'] },
      { label: 'Scheduled', href: '/reports/scheduled', anyOf: ['reports.schedule'] },
    ],
  },
  {
    label: 'Admin',
    href: '/admin/users',
    icon: Settings2,
    anyOf: [
      'users.view',
      'roles.manage',
      'teams.manage',
      'reference.manage',
      'settings.view',
    ],
    children: [
      { label: 'Users', href: '/admin/users', anyOf: ['users.view'] },
      { label: 'Roles', href: '/admin/roles', anyOf: ['roles.manage'] },
      { label: 'Teams', href: '/admin/teams', anyOf: ['teams.manage'] },
      {
        label: 'Reference Data',
        href: '/admin/reference',
        anyOf: ['reference.manage'],
      },
      { label: 'Settings', href: '/admin/settings', anyOf: ['settings.view'] },
    ],
  },
];
