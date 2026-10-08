<script setup lang="ts">
import { computed, ref } from 'vue';
import { Link } from '@inertiajs/vue3';
import {
  ArrowLeft,
  CircleUserRound,
  Info,
  Layers,
  FileText,
  StickyNote,
  History,
} from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import StatCard from '@/components/metrics/StatCard.vue';
import Spinner from '@/components/ui/Spinner.vue';
import RiskBadge from '@/components/compliance/RiskBadge.vue';
import DocumentsPanel from '@/components/compliance/DocumentsPanel.vue';
import ComplianceNotesPanel from '@/components/compliance/ComplianceNotesPanel.vue';
import ComplianceTimelinePanel from '@/components/compliance/ComplianceTimelinePanel.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import AccountTypePill from '@/components/trading/AccountTypePill.vue';
import { cn, timeAgo } from '@/lib/utils';
import { ShieldCheck, MapPin } from '@lucide/vue';
import { useClientKyc } from '@/queries/compliance';
import { useApplicationsList } from '@/queries/applications';

defineOptions({ layout: null });

/* KYC profile detail with tabs. `clientId` comes from the route. */
const props = defineProps<{ clientId: number }>();
const profile = useClientKyc(() => props.clientId);

// KYC review cycles (this profile's own history)…
const applications = computed(() => profile.data.value?.applications ?? []);
// …and the client's canonical (Demo/Live) applications, which open the same
// Application Details page used everywhere else (no second implementation).
const tradingApps = useApplicationsList(computed(() => ({ client_id: props.clientId })));
const tradingRows = computed(() => tradingApps.data.value?.rows ?? []);

type Tab = 'overview' | 'applications' | 'documents' | 'notes' | 'timeline';
const tab = ref<Tab>('overview');
const tabs: { key: Tab; label: string; icon: typeof Info }[] = [
  { key: 'overview', label: 'Overview', icon: Info },
  { key: 'applications', label: 'Applications', icon: Layers },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'timeline', label: 'Timeline', icon: History },
];
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-5xl p-4 sm:p-6">
      <Link href="/compliance/profiles" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft class="size-4" /> Back to profiles
      </Link>

      <div v-if="profile.isLoading.value" class="flex h-64 items-center justify-center">
        <Spinner label="Loading profile…" />
      </div>

      <template v-else-if="profile.data.value">
        <header class="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
          <div class="flex items-center gap-3">
            <span class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CircleUserRound class="size-7" />
            </span>
            <div>
              <h1 class="text-lg font-semibold text-fg">Client #{{ clientId }}</h1>
              <div class="mt-0.5 flex items-center gap-2">
                <StatusBadge :status="profile.data.value.status" />
                <RiskBadge :risk="profile.data.value.risk_level" />
              </div>
            </div>
          </div>
          <span v-if="profile.data.value.verified_at" class="text-sm text-muted">
            Verified {{ timeAgo(profile.data.value.verified_at) }}
          </span>
        </header>

        <!-- tabs -->
        <nav class="mb-4 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
          <button
            v-for="t in tabs"
            :key="t.key"
            role="tab"
            :aria-selected="tab === t.key"
            :class="
              cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                tab === t.key ? 'border-primary text-fg' : 'border-transparent text-muted hover:text-fg',
              )
            "
            @click="tab = t.key"
          >
            <component :is="t.icon" class="size-4" /> {{ t.label }}
          </button>
        </nav>

        <!-- OVERVIEW -->
        <div v-if="tab === 'overview'" class="grid grid-cols-2 gap-4">
          <StatCard
            label="Identity"
            :value="profile.data.value.identity_verified ? 'Verified' : 'Pending'"
            :icon="ShieldCheck"
            :tone="profile.data.value.identity_verified ? 'success' : 'warning'"
          />
          <StatCard
            label="Address"
            :value="profile.data.value.address_verified ? 'Verified' : 'Pending'"
            :icon="MapPin"
            :tone="profile.data.value.address_verified ? 'success' : 'warning'"
          />
          <StatCard label="Applications" :value="applications.length" :icon="Layers" />
          <StatCard label="Risk" :value="profile.data.value.risk_level ?? 'Unrated'" tone="warning" />
        </div>

        <!-- APPLICATIONS -->
        <div v-else-if="tab === 'applications'" class="space-y-5">
          <!-- Canonical Demo/Live applications → Application Details -->
          <section>
            <h2 class="mb-2 text-sm font-semibold text-fg">Trading applications</h2>
            <SkeletonList v-if="tradingApps.isLoading.value && !tradingRows.length" :rows="2" />
            <EmptyState
              v-else-if="!tradingRows.length"
              :icon="Layers"
              title="No trading applications"
              description="This client has no Demo or Live applications yet."
              class="border-0"
            />
            <ul v-else class="space-y-2">
              <li v-for="a in tradingRows" :key="a.id">
                <Link
                  :href="`/trading/applications/${a.reference}`"
                  class="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-muted-surface"
                >
                  <div class="min-w-0">
                    <p class="font-mono text-sm text-fg">{{ a.reference }}</p>
                    <p class="text-xs text-muted">
                      {{ a.platform?.name ?? '—' }} · {{ a.created_at ? timeAgo(a.created_at) : '—' }}
                    </p>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <AccountTypePill :type="a.account_type" />
                    <StatusBadge :status="a.status" />
                  </div>
                </Link>
              </li>
            </ul>
          </section>

          <!-- KYC review cycles (read-only history) -->
          <section>
            <h2 class="mb-2 text-sm font-semibold text-fg">KYC review cycles</h2>
            <EmptyState v-if="!applications.length" :icon="Layers" title="No KYC cycles" class="border-0" />
            <ul v-else class="space-y-2">
              <li v-for="a in applications" :key="a.id" class="rounded-lg border border-border bg-surface p-3">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-fg">KYC application #{{ a.id }} · attempt {{ a.attempt }}</p>
                    <p class="text-xs text-muted">{{ a.documents?.length ?? 0 }} documents · {{ a.submitted_at ? timeAgo(a.submitted_at) : 'not submitted' }}</p>
                  </div>
                  <StatusBadge :status="a.status" />
                </div>
                <p v-if="a.decision_reason" class="mt-2 text-sm text-muted">{{ a.decision_reason }}</p>
              </li>
            </ul>
          </section>
        </div>

        <!-- DOCUMENTS / NOTES / TIMELINE -->
        <DocumentsPanel v-else-if="tab === 'documents'" :client-id="clientId" />
        <ComplianceNotesPanel v-else-if="tab === 'notes'" :client-id="clientId" />
        <ComplianceTimelinePanel v-else :client-id="clientId" />
      </template>
    </div>
  </AppLayout>
</template>
