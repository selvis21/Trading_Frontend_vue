<script setup lang="ts">
import { computed, ref, watch, useTemplateRef } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
} from 'reka-ui';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCw,
  Download,
  Check,
  Ban,
  FileText,
  History,
} from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Spinner from '@/components/ui/Spinner.vue';
import ReasonDialog from './ReasonDialog.vue';
import { cn, timeAgo } from '@/lib/utils';
import { useDocumentBlob } from '@/composables/useDocumentBlob';
import { useReviewDocument } from '@/queries/compliance';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import type { KycDocument, KycStatusHistory } from '@/types/compliance';

/* Full document review surface: authenticated blob preview with zoom /
 * rotate / fullscreen, plus approve / reject (reason-gated) and the
 * document's review history. Lazy-loaded — the heavy viewer only ships
 * when a reviewer opens a document. */
const props = defineProps<{
  open: boolean;
  document: KycDocument | null;
  clientId: number;
  history?: KycStatusHistory[];
}>();
const emit = defineEmits<{ 'update:open': [v: boolean]; reviewed: [] }>();

const auth = useAuthStore();
const toast = useToast();
const review = useReviewDocument();

const docId = computed(() => (props.open ? (props.document?.id ?? null) : null));
const { url, mime, loading, error, download } = useDocumentBlob(docId);

const isImage = computed(() => (mime.value ?? props.document?.mime_type ?? '').startsWith('image/'));
const isPdf = computed(() => (mime.value ?? props.document?.mime_type ?? '').includes('pdf'));

const scale = ref(1);
const rotation = ref(0);
watch(
  () => props.open,
  (o) => {
    if (o) {
      scale.value = 1;
      rotation.value = 0;
    }
  },
);

const stage = useTemplateRef<HTMLElement>('stage');
function fullscreen() {
  stage.value?.requestFullscreen?.();
}

const canReview = computed(() => auth.can('compliance.review'));
const rejectOpen = ref(false);

function approve() {
  if (!props.document) return;
  review.mutate(
    { id: props.document.id, status: 'verified', clientId: props.clientId },
    {
      onSuccess: () => {
        toast.success('Document verified');
        emit('reviewed');
        emit('update:open', false);
      },
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}
function reject(reason: string) {
  if (!props.document) return;
  review.mutate(
    { id: props.document.id, status: 'rejected', reason, clientId: props.clientId },
    {
      onSuccess: () => {
        toast.success('Document rejected');
        rejectOpen.value = false;
        emit('reviewed');
        emit('update:open', false);
      },
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}

const docHistory = computed(() =>
  (props.history ?? []).filter((h) => h.kyc_document_id === props.document?.id),
);
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <!-- Full-screen review surface. Sits ABOVE the client drawer (z-50),
           the KYC modal (z-[80]) and the ClientPicker popover (z-[70]) that can
           all be open behind it, but BELOW the global loading bar (z-[100]).
           Its own reject/verify reason dialog uses Modal layer="elevated". -->
      <DialogOverlay class="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogContent
        class="fixed inset-3 z-[91] flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg data-[state=open]:animate-in data-[state=open]:zoom-in-95 sm:inset-6"
      >
        <!-- header -->
        <header class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div class="flex min-w-0 items-center gap-2.5">
            <FileText class="size-5 shrink-0 text-muted" />
            <div class="min-w-0">
              <DialogTitle class="truncate text-sm font-semibold text-fg">
                {{ document?.type?.name ?? 'Document' }}
                <span class="font-normal text-muted">· {{ document?.file_name }}</span>
              </DialogTitle>
              <div class="flex items-center gap-2 text-xs text-muted">
                <StatusBadge :status="document?.status" />
                <span v-if="document?.id_number">ID {{ document.id_number }}</span>
                <span v-if="document?.expiry_date">exp {{ document.expiry_date }}</span>
              </div>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <Button size="icon-sm" variant="ghost" aria-label="Zoom out" @click="scale = Math.max(0.25, scale - 0.25)"><ZoomOut class="size-4" /></Button>
            <span class="w-10 text-center text-xs tabular-nums text-muted">{{ Math.round(scale * 100) }}%</span>
            <Button size="icon-sm" variant="ghost" aria-label="Zoom in" @click="scale = Math.min(4, scale + 0.25)"><ZoomIn class="size-4" /></Button>
            <Button v-if="isImage" size="icon-sm" variant="ghost" aria-label="Rotate" @click="rotation = (rotation + 90) % 360"><RotateCw class="size-4" /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Fullscreen" @click="fullscreen"><Maximize class="size-4" /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Download" @click="document && download(document.file_name)"><Download class="size-4" /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Close" @click="emit('update:open', false)"><X class="size-4" /></Button>
          </div>
        </header>

        <div class="flex min-h-0 flex-1">
          <!-- preview stage -->
          <div ref="stage" class="relative flex min-w-0 flex-1 items-center justify-center overflow-auto bg-surface-sunken p-4">
            <Spinner v-if="loading" label="Loading document…" />
            <div v-else-if="error" class="text-center text-sm text-muted">
              Could not load this document.
            </div>
            <img
              v-else-if="isImage && url"
              :src="url"
              :alt="document?.file_name"
              class="max-h-full max-w-full object-contain transition-transform"
              :style="{ transform: `scale(${scale}) rotate(${rotation}deg)` }"
            />
            <iframe
              v-else-if="isPdf && url"
              :src="url"
              class="h-full w-full rounded border border-border bg-white"
              :style="{ transform: `scale(${scale})`, transformOrigin: 'top center' }"
              title="Document preview"
            />
            <div v-else class="text-center text-sm text-muted">
              Preview not available — <button class="text-primary hover:underline" @click="document && download(document.file_name)">download</button> to view.
            </div>
          </div>

          <!-- side: review + history -->
          <aside class="hidden w-72 shrink-0 flex-col border-s border-border md:flex">
            <div class="space-y-3 border-b border-border p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">Review</p>
              <p v-if="document?.comment" class="rounded-md bg-muted-surface p-2 text-xs text-fg">
                {{ document.comment }}
              </p>
              <div v-if="document?.reviewed_at" class="text-xs text-muted">
                Reviewed {{ timeAgo(document.reviewed_at) }}
              </div>
              <div v-if="canReview" class="flex gap-2">
                <Button
                  variant="success"
                  size="sm"
                  class="flex-1"
                  :loading="review.isPending.value"
                  @click="approve"
                >
                  <Check class="size-4" /> Verify
                </Button>
                <Button size="sm" variant="danger" class="flex-1" @click="rejectOpen = true">
                  <Ban class="size-4" /> Reject
                </Button>
              </div>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto p-4">
              <p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <History class="size-3.5" /> History
              </p>
              <ul v-if="docHistory.length" class="space-y-2">
                <li v-for="h in docHistory" :key="h.id" class="text-xs">
                  <div class="flex items-center gap-1.5">
                    <StatusBadge :status="h.to_status ?? undefined" />
                    <span class="text-muted">{{ timeAgo(h.created_at) }}</span>
                  </div>
                  <p v-if="h.reason" class="mt-0.5 text-muted">{{ h.reason }}</p>
                </li>
              </ul>
              <p v-else class="text-xs text-muted">No review history yet.</p>
            </div>
          </aside>
        </div>

        <ReasonDialog
          :open="rejectOpen"
          title="Reject document"
          description="A reason is required and recorded in the audit trail."
          confirm-label="Reject document"
          tone="danger"
          reason-required
          :loading="review.isPending.value"
          @update:open="rejectOpen = $event"
          @confirm="reject"
        />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
