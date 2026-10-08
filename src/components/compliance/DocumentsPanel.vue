<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import { FileText, Eye, Check, ImageIcon, FileType, Upload, Loader2 } from '@lucide/vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Modal from '@/components/ui/Modal.vue';
import SkeletonList from '@/components/skeleton/SkeletonList.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { cn } from '@/lib/utils';
import {
  useClientKycDocuments,
  useReviewDocument,
  useDocumentTypes,
  useUploadDocument,
} from '@/queries/compliance';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import type {
  KycDocument,
  KycDocumentType,
  KycStatusHistory,
  DocumentVerificationStatus,
} from '@/types/compliance';
import type { StatusTone } from '@/types';

/* Documents list for a client. Each row opens the (lazy) viewer; a quick
 * verify is available inline. Compliance staff can upload new documents which
 * appear immediately (and, when Jumio is enabled, carry a verification badge). */
const props = defineProps<{
  clientId: number;
  history?: KycStatusHistory[];
}>();

const auth = useAuthStore();
const toast = useToast();
const docs = useClientKycDocuments(() => props.clientId);
const review = useReviewDocument();
const docTypes = useDocumentTypes();
const upload = useUploadDocument();

const canReview = computed(() => auth.can('compliance.review'));
const canUpload = computed(() => auth.can('compliance.upload'));

// Lazy: the viewer (blob fetch + zoom/pdf) only loads on first open.
const DocumentViewer = defineAsyncComponent(() => import('./DocumentViewer.vue'));
const viewerOpen = ref(false);
const active = ref<KycDocument | null>(null);

function open(doc: KycDocument) {
  active.value = doc;
  viewerOpen.value = true;
}
function quickVerify(doc: KycDocument) {
  review.mutate(
    { id: doc.id, status: 'verified', clientId: props.clientId },
    {
      onSuccess: () => toast.success('Document verified'),
      onError: () => toast.error('Could not verify'),
    },
  );
}

/* ----------------------------- upload dialog ----------------------------- */
const uploadOpen = ref(false);
const typeId = ref<number | null>(null);
const file = ref<File | null>(null);
const idNumber = ref('');
const expiryDate = ref('');

// Flatten any hierarchical document types into selectable options.
const typeOptions = computed<KycDocumentType[]>(() => {
  const flat: KycDocumentType[] = [];
  const walk = (list: KycDocumentType[] = []) => {
    for (const t of list) {
      flat.push(t);
      if (t.children?.length) walk(t.children);
    }
  };
  walk(docTypes.data.value ?? []);
  return flat.filter((t) => t.is_active);
});
const selectedType = computed(() =>
  typeOptions.value.find((t) => t.id === typeId.value) ?? null,
);
const requiresId = computed(() => !!selectedType.value?.requires_id_number);
const requiresExpiry = computed(() => !!selectedType.value?.requires_expiry);

const valid = computed(
  () =>
    !!typeId.value &&
    !!file.value &&
    (!requiresId.value || !!idNumber.value.trim()) &&
    (!requiresExpiry.value || !!expiryDate.value),
);

function openUpload() {
  typeId.value = null;
  file.value = null;
  idNumber.value = '';
  expiryDate.value = '';
  uploadOpen.value = true;
}
function onFile(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null;
}
function submitUpload() {
  if (!valid.value || !file.value || !typeId.value) return;
  const form = new FormData();
  form.append('kyc_document_type_id', String(typeId.value));
  form.append('file', file.value);
  if (requiresId.value && idNumber.value.trim()) form.append('id_number', idNumber.value.trim());
  if (requiresExpiry.value && expiryDate.value) form.append('expiry_date', expiryDate.value);

  upload.mutate(
    { clientId: props.clientId, form },
    {
      onSuccess: () => {
        toast.success('Document uploaded');
        uploadOpen.value = false;
        // Documents + KYC timeline both refresh (invalidated by the mutation).
        docs.refetch();
      },
      onError: () => toast.error('Upload failed — check the file and required fields.'),
    },
  );
}

/* Verification (Jumio) badge tone — distinct from the human-review status. */
const VERIFICATION_TONE: Record<DocumentVerificationStatus, StatusTone> = {
  uploaded: 'neutral',
  submitted_to_jumio: 'info',
  auto_verified: 'success',
  manual_review_required: 'warning',
  rejected: 'danger',
};

function fmtSize(bytes: number) {
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`;
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="canUpload" class="flex justify-end">
      <Button size="sm" @click="openUpload">
        <Upload class="size-4" /> Upload document
      </Button>
    </div>

    <SkeletonList v-if="docs.isLoading.value" :rows="3" />
    <EmptyState
      v-else-if="!docs.data.value?.length"
      :icon="FileText"
      title="No documents"
      description="No KYC documents uploaded for this client."
      class="border-0"
    />
    <ul v-else class="space-y-2">
      <li
        v-for="doc in docs.data.value"
        :key="doc.id"
        class="group flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5"
      >
        <span
          :class="
            cn(
              'flex size-9 shrink-0 items-center justify-center rounded-md',
              doc.mime_type?.startsWith('image/') ? 'bg-status-info/10 text-status-info' : 'bg-status-warning/10 text-status-warning',
            )
          "
        >
          <ImageIcon v-if="doc.mime_type?.startsWith('image/')" class="size-4" />
          <FileType v-else class="size-4" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="truncate text-sm font-medium text-fg">{{ doc.type?.name ?? 'Document' }}</span>
            <StatusBadge :status="doc.status" />
            <StatusBadge
              v-if="doc.verification_status"
              :status="doc.verification_status"
              :tone="VERIFICATION_TONE[doc.verification_status]"
            />
          </div>
          <p class="truncate text-xs text-muted">
            {{ doc.file_name }} · {{ fmtSize(doc.file_size) }}
            <span v-if="doc.data_source"> · {{ doc.data_source }}</span>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <Button
            v-if="canReview && doc.status !== 'verified'"
            size="icon-sm"
            variant="ghost"
            aria-label="Quick verify"
            :loading="review.isPending.value"
            @click="quickVerify(doc)"
          >
            <Check class="size-4 text-status-success" />
          </Button>
          <Button size="sm" variant="outline" @click="open(doc)">
            <Eye class="size-4" /> Review
          </Button>
        </div>
      </li>
    </ul>

    <DocumentViewer
      v-if="active"
      :open="viewerOpen"
      :document="active"
      :client-id="clientId"
      :history="history"
      @update:open="viewerOpen = $event"
      @reviewed="docs.refetch()"
    />

    <!-- Upload dialog -->
    <Modal
      :open="uploadOpen"
      title="Upload KYC document"
      description="Attach a document to this client's KYC application."
      size="md"
      @update:open="uploadOpen = $event"
    >
      <div class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">
            Document type <span class="text-status-danger">*</span>
          </label>
          <select
            :value="typeId ?? ''"
            class="h-9 w-full rounded-md border border-input bg-surface px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @change="typeId = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null"
          >
            <option value="">— Select document type —</option>
            <option v-for="t in typeOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">
            File <span class="text-status-danger">*</span>
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            class="block w-full text-sm text-fg file:mr-3 file:rounded-md file:border-0 file:bg-muted-surface file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted-surface/80"
            @change="onFile"
          />
          <p class="text-xs text-muted">JPEG, PNG or PDF · max 2 MB.</p>
        </div>

        <div v-if="requiresId" class="space-y-1.5">
          <label class="text-sm font-medium text-fg">
            ID number <span class="text-status-danger">*</span>
          </label>
          <Input v-model="idNumber" placeholder="Document / ID number" />
        </div>

        <div v-if="requiresExpiry" class="space-y-1.5">
          <label class="text-sm font-medium text-fg">
            Expiry date <span class="text-status-danger">*</span>
          </label>
          <Input v-model="expiryDate" type="date" />
        </div>
      </div>

      <div class="mt-2 flex justify-end gap-2">
        <Button variant="ghost" @click="uploadOpen = false">Cancel</Button>
        <Button :disabled="!valid || upload.isPending.value" @click="submitUpload">
          <Loader2 v-if="upload.isPending.value" class="size-4 animate-spin" />
          <Upload v-else class="size-4" />
          Upload
        </Button>
      </div>
    </Modal>
  </div>
</template>
