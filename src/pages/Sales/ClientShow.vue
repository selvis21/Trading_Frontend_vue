<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ArrowLeft, ClipboardList, Info, UserSquare } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Avatar from '@/components/ui/Avatar.vue';
import Badge from '@/components/ui/Badge.vue';
import Spinner from '@/components/ui/Spinner.vue';
import LeadDetail from '@/components/sales/LeadDetail.vue';
import LeadActivityRail from '@/components/sales/LeadActivityRail.vue';
import ClientActionsPanel from '@/components/sales/ClientActionsPanel.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AccountTypePill from '@/components/trading/AccountTypePill.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import { useClientDetail } from '@/queries/clients';
import { useLead } from '@/queries/leads';
import { useApplicationsList } from '@/queries/applications';
import { timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';

/* Client profile — resolved by CLIENT id (GET /clients/{client}), because
 * every cross-module link (wallet, transaction, trading account, request)
 * carries a client id. Clients that originated from a lead show the full
 * lead-framed profile (detail tabs + activity); contact-only clients (no
 * originating lead) get the identity header + the act-on-behalf panel. */
const props = defineProps<{ clientId: number }>();

const auth = useAuthStore();
const client = useClientDetail(() => props.clientId);
const leadId = computed(() => client.data.value?.lead_id ?? null);
const lead = useLead(leadId);

// The client's applications (canonical list endpoint, scoped by client_id).
const applications = useApplicationsList(computed(() => ({ client_id: props.clientId })));
const appRows = computed(() => applications.data.value?.rows ?? []);

const displayName = computed(
  () => client.data.value?.display_name || client.data.value?.name || 'Client',
);
const contact = computed(
  () => client.data.value?.email || client.data.value?.mobile || '',
);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-[100rem] p-4 sm:p-6">
      <Link href="/clients" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft class="size-4" /> Back to clients
      </Link>

      <div v-if="client.isLoading.value && !client.data.value" class="flex h-64 items-center justify-center">
        <Spinner label="Loading client…" />
      </div>

      <div
        v-else-if="client.isError.value || !client.data.value"
        class="mx-auto mt-16 max-w-md rounded-lg border border-border bg-surface p-8 text-center"
      >
        <UserSquare class="mx-auto size-8 text-muted" />
        <h1 class="mt-3 text-lg font-semibold text-fg">Client not found</h1>
        <p class="mt-1 text-sm text-muted">
          This client does not exist or you do not have access to it.
        </p>
      </div>

      <template v-else>
        <!-- client header -->
        <header class="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
          <div class="flex items-center gap-3">
            <Avatar :name="displayName" size="lg" class="size-14 text-lg" />
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-lg font-semibold text-fg">{{ displayName }}</h1>
                <Badge :tone="client.data.value.status === 'inactive' ? 'neutral' : 'success'">
                  {{ (client.data.value.status ?? 'active').toUpperCase() }}
                </Badge>
                <Badge v-if="client.data.value.is_contact_only" tone="info">Contact only</Badge>
              </div>
              <p class="text-sm text-muted">
                <span class="font-mono">{{ client.data.value.client_code ?? '—' }}</span>
                <template v-if="contact"> · {{ contact }}</template>
              </p>
            </div>
          </div>
          <dl class="flex gap-6 text-sm">
            <div>
              <dt class="text-xs text-muted">KYC</dt>
              <dd :class="client.data.value.kyc_verified ? 'text-status-success' : 'text-fg'">
                {{ client.data.value.kyc_verified ? 'Verified' : 'Not verified' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Converted</dt>
              <dd class="text-fg">
                {{ client.data.value.converted_at ? new Date(client.data.value.converted_at).toLocaleDateString() : '—' }}
              </dd>
            </div>
            <div v-if="lead.data.value">
              <dt class="text-xs text-muted">Owner</dt>
              <dd class="text-fg">{{ lead.data.value.owner?.name ?? '—' }}</dd>
            </div>
          </dl>
        </header>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section class="lg:col-span-8">
            <!-- Converted client: full lead-framed profile. -->
            <div v-if="leadId" class="rounded-lg border border-border bg-surface">
              <LeadDetail :lead-id="leadId" />
            </div>

            <!-- Contact-only client: no originating lead lifecycle. -->
            <div v-else class="rounded-lg border border-border bg-surface p-6">
              <div class="flex items-start gap-3">
                <Info class="mt-0.5 size-5 text-muted" />
                <div>
                  <h2 class="text-sm font-semibold text-fg">Contact-only client</h2>
                  <p class="mt-1 text-sm text-muted">
                    This client was registered directly (website application or the
                    client-first account workflow) and has no originating lead, so
                    there is no lead timeline. Use the panel on the right to manage
                    KYC, trading accounts and funding.
                  </p>
                  <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt class="text-xs text-muted">Client code</dt>
                      <dd class="font-mono text-fg">{{ client.data.value.client_code ?? '—' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs text-muted">Email</dt>
                      <dd class="text-fg">{{ client.data.value.email ?? '—' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs text-muted">Mobile</dt>
                      <dd class="text-fg">{{ client.data.value.mobile ?? '—' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs text-muted">Registered</dt>
                      <dd class="text-fg">
                        {{ client.data.value.converted_at ? new Date(client.data.value.converted_at).toLocaleString() : '—' }}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </section>

          <aside class="lg:col-span-4 space-y-5">
            <!-- Applications: clickable through to the canonical details page -->
            <section v-if="auth.can('trading.view')" class="rounded-lg border border-border bg-surface p-4">
              <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <ClipboardList class="size-4 text-muted" /> Applications
              </h2>
              <SkeletonList v-if="applications.isLoading.value && !appRows.length" :rows="2" />
              <p v-else-if="!appRows.length" class="text-sm text-muted">
                No applications for this client yet.
              </p>
              <ul v-else class="space-y-2">
                <li v-for="a in appRows" :key="a.id">
                  <Link
                    :href="`/trading/applications/${a.reference}`"
                    class="block rounded-md border border-border p-2.5 transition-colors hover:bg-muted-surface"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-mono text-xs text-fg">{{ a.reference }}</span>
                      <AccountTypePill :type="a.account_type" />
                    </div>
                    <div class="mt-1.5 flex items-center justify-between gap-2">
                      <StatusBadge :status="a.status" />
                      <span class="text-xs text-muted">{{ a.created_at ? timeAgo(a.created_at) : '—' }}</span>
                    </div>
                  </Link>
                </li>
              </ul>
            </section>

            <ClientActionsPanel
              :client-id="client.data.value.id"
              :currency-id="client.data.value.currency_id"
            />
            <LeadActivityRail v-if="leadId" :lead-id="leadId" />
          </aside>
        </div>
      </template>
    </div>
  </AppLayout>
</template>
