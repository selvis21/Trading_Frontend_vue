import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router';
import { getToken, rememberIntended } from '@/services/api';
import { BRAND_NAME } from '@/lib/brand';
import { useAuthStore } from '@/stores/auth';

/* ------------------------------------------------------------------ *
 * Application router.
 *
 * Mirrors the former Laravel `routes/web.php` page map one-for-one:
 * same paths, same names, same component props. Pages self-wrap their
 * layout (AppLayout / AuthLayout), so there are no nested layout routes.
 *
 * Pages are lazily imported → one chunk per route (preserving the
 * Inertia `import.meta.glob` code-splitting behaviour).
 *
 * Auth: `meta.public` routes (login, password reset, error) are open;
 * everything else requires a stored bearer token. AppLayout still owns
 * the authoritative async hydration (GET /auth/me) and must-reset/403
 * handling — this guard is a fast pre-check that bounces token-less
 * visitors straight to /login and remembers where they were headed.
 * ------------------------------------------------------------------ */

const routes: RouteRecordRaw[] = [
  // --- Auth shell -------------------------------------------------------
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/Auth/Login.vue'),
    meta: { public: true, title: 'Sign in' },
  },
  {
    path: '/password/reset',
    name: 'password.reset',
    component: () => import('@/pages/Auth/PasswordReset.vue'),
    meta: { public: true, title: 'Reset password' },
  },

  // --- Foundation -------------------------------------------------------
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/App/Home.vue'),
    meta: { title: 'Home' , permission: ['dashboard.view'] },
  },

  // --- Settings ---------------------------------------------------------
  {
    path: '/settings/profile',
    name: 'settings.profile',
    component: () => import('@/pages/Settings/Profile.vue'),
    meta: { title: 'Profile' },
  },
  {
    path: '/settings/preferences',
    name: 'settings.preferences',
    component: () => import('@/pages/Settings/Preferences.vue'),
    meta: { title: 'Preferences' },
  },
  {
    path: '/settings/security',
    name: 'settings.security',
    component: () => import('@/pages/Settings/Security.vue'),
    meta: { title: 'Security' },
  },

  // --- Sales ------------------------------------------------------------
  {
    path: '/leads',
    name: 'leads.index',
    component: () => import('@/pages/Sales/Leads.vue'),
    props: { scope: 'mine' },
    meta: { title: 'My Leads' , permission: ['leads.view'] },
  },
  {
    path: '/leads/inbox',
    name: 'leads.inbox',
    component: () => import('@/pages/Sales/Leads.vue'),
    props: { scope: 'unassigned' },
    meta: { title: 'Lead Inbox' , permission: ['leads.view'] },
  },
  {
    path: '/leads/pool',
    name: 'leads.pool',
    component: () => import('@/pages/Sales/Leads.vue'),
    props: { scope: 'pool' },
    meta: { title: 'Public Sea' , permission: ['leads.view'] },
  },
  {
    path: '/leads/pipeline',
    name: 'leads.pipeline',
    component: () => import('@/pages/Sales/Leads.vue'),
    props: { scope: 'mine', initialView: 'kanban' },
    meta: { title: 'Pipeline' , permission: ['leads.view'] },
  },
  {
    path: '/leads/:lead(\\d+)',
    name: 'leads.show',
    component: () => import('@/pages/Sales/LeadShow.vue'),
    props: (route) => ({ leadId: Number(route.params.lead) }),
    meta: { title: 'Lead' , permission: ['leads.view'] },
  },
  {
    path: '/clients',
    name: 'clients.index',
    component: () => import('@/pages/Sales/Clients.vue'),
    meta: { title: 'Clients' , permission: ['leads.view'] },
  },
  {
    // Resolved by CLIENT id — every cross-module link carries a client id.
    path: '/clients/:client(\\d+)',
    name: 'clients.show',
    component: () => import('@/pages/Sales/ClientShow.vue'),
    props: (route) => ({ clientId: Number(route.params.client) }),
    meta: { title: 'Client' , permission: ['leads.view'] },
  },
  {
    path: '/mentions',
    name: 'mentions.index',
    component: () => import('@/pages/Sales/Mentions.vue'),
    meta: { title: 'Mentions' , permission: ['leads.view'] },
  },

  // --- Compliance -------------------------------------------------------
  {
    path: '/compliance/queue',
    name: 'compliance.queue',
    component: () => import('@/pages/Compliance/Queue.vue'),
    meta: { title: 'KYC Queue' , permission: ['compliance.view'] },
  },
  {
    path: '/compliance/profiles',
    name: 'compliance.profiles',
    component: () => import('@/pages/Compliance/Profiles.vue'),
    meta: { title: 'Compliance Profiles' , permission: ['compliance.view'] },
  },
  {
    path: '/compliance/profiles/:client(\\d+)',
    name: 'compliance.profile.show',
    component: () => import('@/pages/Compliance/ProfileShow.vue'),
    props: (route) => ({ clientId: Number(route.params.client) }),
    meta: { title: 'Compliance Profile' , permission: ['compliance.view'] },
  },
  {
    path: '/compliance/document-types',
    name: 'compliance.document-types',
    component: () => import('@/pages/Compliance/DocumentTypes.vue'),
    meta: { title: 'Document Types' , permission: ['compliance.view'] },
  },

  // --- Trading ----------------------------------------------------------
  {
    path: '/trading/accounts',
    name: 'trading.accounts',
    component: () => import('@/pages/Trading/Accounts.vue'),
    meta: { title: 'Trading Accounts' , permission: ['trading.view'] },
  },
  {
    path: '/trading/workspace',
    name: 'trading.workspace',
    component: () => import('@/pages/Trading/Workspace.vue'),
    meta: { title: 'Trading Workspace' , permission: ['trading.view'] },
  },
  {
    path: '/trading/requests',
    name: 'trading.requests',
    component: () => import('@/pages/Trading/Requests.vue'),
    meta: { title: 'Open-Account Requests' , permission: ['trading.view'] },
  },
  {
    // Applications — the CRM's reproduction of the public Website Demo/Live
    // application flows (same intake service; see routes/api/v1/trading.php).
    // The landing page is the discovery point; Demo/Live are its children in
    // the sidebar and cards on the page.
    path: '/trading/applications',
    name: 'trading.applications',
    component: () => import('@/pages/Trading/ApplicationsHome.vue'),
    meta: { title: 'Applications' , permission: ['trading.applications.demo.create', 'trading.applications.live.create'] },
  },
  {
    path: '/trading/applications/demo',
    name: 'trading.applications.demo',
    component: () => import('@/pages/Trading/ApplicationsDemo.vue'),
    meta: { title: 'Demo Application' , permission: ['trading.applications.demo.create'] },
  },
  {
    path: '/trading/applications/live',
    name: 'trading.applications.live',
    component: () => import('@/pages/Trading/ApplicationsLive.vue'),
    meta: { title: 'Live Application' , permission: ['trading.applications.live.create'] },
  },
  {
    // Canonical Application Details — reached from the Applications list, the
    // client-360° Applications panel and the compliance profile Applications
    // tab. Keyed by the public APP… reference.
    path: '/trading/applications/:reference([A-Za-z0-9]+)',
    name: 'trading.applications.show',
    component: () => import('@/pages/Trading/ApplicationShow.vue'),
    props: (route) => ({ reference: String(route.params.reference) }),
    meta: { title: 'Application' , permission: ['trading.view'] },
  },
  {
    path: '/trading/accounts/:account(\\d+)',
    name: 'trading.accounts.show',
    component: () => import('@/pages/Trading/AccountShow.vue'),
    props: (route) => ({ accountId: Number(route.params.account) }),
    meta: { title: 'Trading Account' , permission: ['trading.view'] },
  },
  {
    path: '/trading/platforms',
    name: 'trading.platforms',
    component: () => import('@/pages/Trading/Platforms.vue'),
    meta: { title: 'Platforms' , permission: ['trading.view'] },
  },
  {
    path: '/trading/groups',
    name: 'trading.groups',
    component: () => import('@/pages/Trading/Groups.vue'),
    meta: { title: 'Groups' , permission: ['trading.view'] },
  },

  // --- Finance ----------------------------------------------------------
  {
    path: '/finance/dashboard',
    name: 'finance.dashboard',
    component: () => import('@/pages/Finance/Dashboard.vue'),
    meta: { title: 'Finance Dashboard' , permission: ['finance.view'] },
  },
  {
    path: '/finance/workspace',
    name: 'finance.workspace',
    component: () => import('@/pages/Finance/Workspace.vue'),
    meta: { title: 'Finance Workspace' , permission: ['finance.view'] },
  },
  {
    path: '/finance/transactions',
    name: 'finance.transactions',
    component: () => import('@/pages/Finance/Transactions.vue'),
    meta: { title: 'Transactions' , permission: ['finance.view'] },
  },
  {
    path: '/finance/deposits',
    name: 'finance.deposits',
    component: () => import('@/pages/Finance/Transactions.vue'),
    props: { view: 'deposits' },
    meta: { title: 'Deposits' , permission: ['finance.view'] },
  },
  {
    path: '/finance/withdrawals',
    name: 'finance.withdrawals',
    component: () => import('@/pages/Finance/Transactions.vue'),
    props: { view: 'withdrawals' },
    meta: { title: 'Withdrawals' , permission: ['finance.view'] },
  },
  {
    path: '/finance/ledger',
    name: 'finance.ledger',
    component: () => import('@/pages/Finance/Ledger.vue'),
    meta: { title: 'Ledger' , permission: ['finance.view'] },
  },
  {
    path: '/finance/transactions/:transaction(\\d+)',
    name: 'finance.transactions.show',
    component: () => import('@/pages/Finance/TransactionShow.vue'),
    props: (route) => ({ transactionId: Number(route.params.transaction) }),
    meta: { title: 'Transaction' , permission: ['finance.view'] },
  },
  {
    path: '/finance/wallets/:wallet(\\d+)',
    name: 'finance.wallets.show',
    component: () => import('@/pages/Finance/WalletShow.vue'),
    props: (route) => ({ walletId: Number(route.params.wallet) }),
    meta: { title: 'Wallet' , permission: ['finance.view'] },
  },
  {
    path: '/finance/payment-methods',
    name: 'finance.payment-methods',
    component: () => import('@/pages/Finance/PaymentMethods.vue'),
    meta: { title: 'Payment Methods' , permission: ['finance.methods.manage', 'finance.view'] },
  },

  // --- Reports ----------------------------------------------------------
  {
    path: '/reports',
    name: 'reports.index',
    component: () => import('@/pages/Reports/Home.vue'),
    meta: { title: 'Reports' , permission: ['reports.view'] },
  },
  {
    path: '/reports/scheduled',
    name: 'reports.scheduled',
    component: () => import('@/pages/Reports/Scheduled.vue'),
    meta: { title: 'Scheduled Reports' , permission: ['reports.schedule', 'reports.view'] },
  },
  {
    path: '/reports/analytics',
    name: 'reports.analytics',
    component: () => import('@/pages/Reports/Analytics.vue'),
    meta: { title: 'Analytics' , permission: ['reports.view'] },
  },
  {
    path: '/reports/view/:key([A-Za-z0-9._-]+)',
    name: 'reports.view',
    component: () => import('@/pages/Reports/Viewer.vue'),
    props: (route) => ({ reportKey: String(route.params.key) }),
    meta: { title: 'Report' , permission: ['reports.view'] },
  },

  // --- Administration ---------------------------------------------------
  {
    path: '/admin/users',
    name: 'admin.users',
    component: () => import('@/pages/Admin/Users.vue'),
    meta: { title: 'Users' , permission: ['users.view'] },
  },
  {
    path: '/admin/roles',
    name: 'admin.roles',
    component: () => import('@/pages/Admin/Roles.vue'),
    meta: { title: 'Roles' , permission: ['roles.view'] },
  },
  {
    path: '/admin/teams',
    name: 'admin.teams',
    component: () => import('@/pages/Admin/Teams.vue'),
    meta: { title: 'Teams' , permission: ['teams.view'] },
  },
  {
    path: '/admin/reference',
    name: 'admin.reference',
    component: () => import('@/pages/Admin/Reference.vue'),
    meta: { title: 'Reference Data' , permission: ['reference.manage', 'options.manage', 'settings.view'] },
  },
  {
    path: '/admin/settings',
    name: 'admin.settings',
    component: () => import('@/pages/Admin/Settings.vue'),
    meta: { title: 'Settings' , permission: ['settings.view'] },
  },

  // --- Error surfaces ---------------------------------------------------
  {
    path: '/403',
    name: 'error.forbidden',
    component: () => import('@/pages/Error.vue'),
    props: { status: 403 },
    meta: { public: true, title: 'Forbidden' },
  },
  {
    path: '/404',
    name: 'error.notfound',
    component: () => import('@/pages/Error.vue'),
    props: { status: 404 },
    meta: { public: true, title: 'Not found' },
  },
  // SPA catch-all → 404 surface (replaces the Laravel catch-all route).
  {
    path: '/:pathMatch(.*)*',
    name: 'spa.catchall',
    component: () => import('@/pages/Error.vue'),
    props: { status: 404 },
    meta: { public: true, title: 'Not found' },
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 };
  },
});

const appName = BRAND_NAME;

router.beforeEach(async (to) => {
  // Fast pre-gate: token-less visitors to a protected route go to /login.
  // AppLayout performs the authoritative /auth/me hydration once mounted.
  if (!to.meta.public && !getToken()) {
    rememberIntended(to.fullPath);
    return { name: 'login' };
  }

  // Permission gate. The API enforces every action server-side; this stops a
  // direct URL or stale bookmark from rendering a page whose queries are all
  // disabled, which read as a misleading "no records" empty state rather than
  // an honest access-denied page.
  const required = to.meta.permission;
  if (!required?.length) return true;

  // Permissions are held in memory only, so on a hard load the store is empty
  // until /auth/me resolves. Hydrate once, then evaluate.
  const auth = useAuthStore();
  if (!auth.ready) await auth.hydrate();
  if (!auth.isAuthenticated) {
    rememberIntended(to.fullPath);
    return { name: 'login' };
  }
  if (!auth.canAny(required)) {
    return { name: 'error.forbidden', query: { from: to.fullPath } };
  }
  return true;
});

router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} · ${appName}` : appName;
});

export default router;
