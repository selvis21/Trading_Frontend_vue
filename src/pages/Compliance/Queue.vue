<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onKeyStroke } from '@vueuse/core';
import { Link } from '@inertiajs/vue3';
import { ShieldCheck, FileText, StickyNote, History, LayoutList } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import QueueList from '@/components/compliance/QueueList.vue';
import KycProfilePanel from '@/components/compliance/KycProfilePanel.vue';
import DocumentsPanel from '@/components/compliance/DocumentsPanel.vue';
import ComplianceNotesPanel from '@/components/compliance/ComplianceNotesPanel.vue';
import ComplianceTimelinePanel from '@/components/compliance/ComplianceTimelinePanel.vue';
import Button from '@/components/ui/Button.vue';
import { cn } from '@/lib/utils';
import { useKycApplications, useKycApplication } from '@/queries/compliance';
import { QUEUE_STATUS, type KycApplication, type QueueView } from '@/types/compliance';

defineOptions({ layout: null });

const view = ref<QueueView>('pending');
const pageSize = ref(25);
const selectedId = ref<number | null>(null);

const params = computed(() => ({
  status: QUEUE_STATUS[view.value],
  page_size: pageSize.value,
}));
const list = useKycApplications(params);
const apps = computed(() => list.data.value?.rows ?? []);
const hasMore = computed(() => apps.value.length < (list.data.value?.total ?? 0));

// Full detail (status_histories etc.) for the selected application.
const detail = useKycApplication(selectedId);
const activeApp = computed<KycApplication | null>(
  () => detail.data.value ?? apps.value.find((a) => a.id === selectedId.value) ?? null,
);
const activeClientId = computed(() => activeApp.value?.client_id ?? null);
const appHistory = computed(() => detail.data.value?.status_histories ?? []);

watch(view, () => (selectedId.value = null));
function select(app: KycApplication) {
  selectedId.value = app.id;
}

// queue keyboard nav (j / k)
function move(delta: number) {
  const i = apps.value.findIndex((a) => a.id === selectedId.value);
  const next = apps.value[Math.max(0, Math.min(apps.value.length - 1, i + delta))];
  if (next) selectedId.value = next.id;
}
onKeyStroke(['j', 'J'], (e) => {
  if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
  move(1);
});
onKeyStroke(['k', 'K'], (e) => {
  if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
  move(-1);
});

const rightTab = ref<'documents' | 'notes' | 'timeline'>('documents');
const rightTabs = [
  { key: 'documents' as const, label: 'Documents', icon: FileText },
  { key: 'notes' as const, label: 'Notes', icon: StickyNote },
  { key: 'timeline' as const, label: 'Timeline', icon: History },
];
</script>

<template>
  <AppLayout>
    <div class="flex h-[calc(100dvh-3.5rem)] flex-col">
      <!-- header -->
      <header class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div class="flex items-center gap-2.5">
          <ShieldCheck class="size-5 text-primary" />
          <div>
            <h1 class="text-lg font-semibold tracking-tight text-fg">KYC Review</h1>
            <p class="text-xs text-muted">Review queue · <kbd class="font-mono">j</kbd>/<kbd class="font-mono">k</kbd> to navigate</p>
          </div>
        </div>
        <Link href="/compliance/profiles">
          <Button variant="outline" size="sm"><LayoutList class="size-4" /> All profiles</Button>
        </Link>
      </header>

      <!-- three panels -->
      <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
        <!-- LEFT: queue -->
        <div class="h-72 shrink-0 border-b border-border lg:h-auto lg:w-80 lg:border-b-0 lg:border-e">
          <QueueList
            :applications="apps"
            :loading="list.isLoading.value"
            :view="view"
            :selected-id="selectedId"
            :total="list.data.value?.total"
            :has-more="hasMore"
            @update:view="view = $event"
            @select="select"
            @load-more="pageSize += 25"
          />
        </div>

        <!-- CENTER: profile + application -->
        <div class="min-h-0 flex-1 border-b border-border lg:border-b-0 lg:border-e">
          <KycProfilePanel
            v-if="activeClientId"
            :key="activeClientId"
            :client-id="activeClientId"
            :application="activeApp"
            @changed="list.refetch(); detail.refetch()"
          />
          <div v-else class="flex h-full items-center justify-center text-sm text-muted">
            Select an application to begin.
          </div>
        </div>

        <!-- RIGHT: documents / notes / timeline -->
        <aside class="flex h-96 shrink-0 flex-col lg:h-auto lg:w-96">
          <div class="flex shrink-0 gap-1 border-b border-border p-2">
            <button
              v-for="t in rightTabs"
              :key="t.key"
              :class="
                cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  rightTab === t.key ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
                )
              "
              @click="rightTab = t.key"
            >
              <component :is="t.icon" class="size-3.5" /> {{ t.label }}
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-3">
            <template v-if="activeClientId">
              <DocumentsPanel v-if="rightTab === 'documents'" :key="`d${activeClientId}`" :client-id="activeClientId" :history="appHistory" />
              <ComplianceNotesPanel v-else-if="rightTab === 'notes'" :key="`n${activeClientId}`" :client-id="activeClientId" :application-id="activeApp?.id" />
              <ComplianceTimelinePanel v-else :key="`t${activeClientId}`" :client-id="activeClientId" />
            </template>
            <div v-else class="flex h-full items-center justify-center text-center text-sm text-muted">
              No client selected.
            </div>
          </div>
        </aside>
      </div>
    </div>
  </AppLayout>
</template>
