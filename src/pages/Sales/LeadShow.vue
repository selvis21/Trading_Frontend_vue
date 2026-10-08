<script setup lang="ts">
import { ref } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ArrowLeft, GitBranch, UserPlus, Pencil } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import Avatar from '@/components/ui/Avatar.vue';
import LeadStatusPill from '@/components/sales/LeadStatusPill.vue';
import LeadDetail from '@/components/sales/LeadDetail.vue';
import LeadActivityRail from '@/components/sales/LeadActivityRail.vue';
import StatusChangeDrawer from '@/components/sales/drawers/StatusChangeDrawer.vue';
import AssignmentDrawer from '@/components/sales/drawers/AssignmentDrawer.vue';
import LeadFormDrawer from '@/components/sales/drawers/LeadFormDrawer.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { useLead } from '@/queries/leads';
import { useLeadStatuses } from '@/queries/salesReference';
import { useAuthStore } from '@/stores/auth';

defineOptions({ layout: null });

/* Full-page master-detail workspace for one lead:
 * left summary rail · centre tabbed profile · right activity rail. */
const props = defineProps<{ leadId: number }>();

const auth = useAuthStore();
const lead = useLead(() => props.leadId);
const statuses = useLeadStatuses();

const statusOpen = ref(false);
const assignOpen = ref(false);
const editOpen = ref(false);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-[100rem] p-4 sm:p-6">
      <Link href="/leads" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft class="size-4" /> Back to leads
      </Link>

      <div v-if="lead.isLoading.value" class="flex h-64 items-center justify-center">
        <Spinner label="Loading lead…" />
      </div>

      <div v-else-if="lead.data.value" class="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <!-- LEFT: summary rail -->
        <aside class="lg:col-span-3">
          <div class="space-y-4 rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-4">
            <div class="flex flex-col items-center text-center">
              <Avatar :name="lead.data.value.name" size="lg" class="size-16 text-xl" />
              <h1 class="mt-2 text-lg font-semibold text-fg">{{ lead.data.value.name }}</h1>
              <LeadStatusPill
                :status-id="lead.data.value.status_id"
                :statuses="statuses.byId.value"
                :fallback="lead.data.value.status?.name"
              />
            </div>

            <div class="space-y-2 border-t border-border pt-3 text-sm">
              <div class="flex justify-between"><span class="text-muted">Email</span><span class="truncate text-fg">{{ lead.data.value.email ?? '—' }}</span></div>
              <div class="flex justify-between"><span class="text-muted">Mobile</span><span class="text-fg">{{ lead.data.value.mobile ?? '—' }}</span></div>
              <div class="flex justify-between"><span class="text-muted">Owner</span><span class="text-fg">{{ lead.data.value.owner?.name ?? 'Unassigned' }}</span></div>
              <div class="flex justify-between"><span class="text-muted">Source</span><span class="truncate text-fg">{{ lead.data.value.campaign_name ?? '—' }}</span></div>
            </div>

            <div class="grid grid-cols-1 gap-2 border-t border-border pt-3">
              <Button v-if="auth.can('leads.track')" variant="outline" size="sm" @click="statusOpen = true">
                <GitBranch class="size-4" /> Change status
              </Button>
              <Button v-if="auth.can('leads.assign')" variant="outline" size="sm" @click="assignOpen = true">
                <UserPlus class="size-4" /> Assign
              </Button>
              <Button v-if="auth.can('leads.update')" variant="ghost" size="sm" @click="editOpen = true">
                <Pencil class="size-4" /> Edit details
              </Button>
            </div>
          </div>
        </aside>

        <!-- CENTRE: tabbed profile -->
        <section class="lg:col-span-6">
          <div class="h-full rounded-lg border border-border bg-surface">
            <LeadDetail :lead-id="leadId" />
          </div>
        </section>

        <!-- RIGHT: activity rail -->
        <aside class="lg:col-span-3">
          <LeadActivityRail :lead-id="leadId" />
        </aside>
      </div>
    </div>

    <StatusChangeDrawer
      v-if="lead.data.value"
      v-model:open="statusOpen"
      :lead-id="leadId"
      :current-status-id="lead.data.value.status_id"
    />
    <AssignmentDrawer v-model:open="assignOpen" :lead-ids="[leadId]" />
    <LeadFormDrawer v-model:open="editOpen" :lead="lead.data.value" />
  </AppLayout>
</template>
