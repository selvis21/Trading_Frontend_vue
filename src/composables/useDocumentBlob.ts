import { ref, watch, onScopeDispose, type MaybeRefOrGetter, toValue } from 'vue';
import { http } from '@/services/api';

/* ------------------------------------------------------------------ *
 * Fetch a KYC document as an authenticated blob and expose an object
 * URL for in-browser preview. The download endpoint streams the file
 * (no signed URL), so it must be fetched with the bearer token. The
 * object URL is revoked on change/unmount to avoid leaks.
 * ------------------------------------------------------------------ */
export function useDocumentBlob(documentId: MaybeRefOrGetter<number | null>) {
  const url = ref<string | null>(null);
  const mime = ref<string | null>(null);
  const loading = ref(false);
  const error = ref(false);

  function revoke() {
    if (url.value) {
      URL.revokeObjectURL(url.value);
      url.value = null;
    }
  }

  async function load() {
    const id = toValue(documentId);
    revoke();
    error.value = false;
    if (!id) return;
    loading.value = true;
    try {
      const res = await http.get(`/kyc-documents/${id}/download`, {
        responseType: 'blob',
      });
      mime.value = res.data.type || res.headers['content-type'] || null;
      url.value = URL.createObjectURL(res.data);
    } catch {
      error.value = true;
    } finally {
      loading.value = false;
    }
  }

  /** Trigger a real file download (Save As) using the same blob. */
  function download(fileName: string) {
    if (!url.value) return;
    const a = document.createElement('a');
    a.href = url.value;
    a.download = fileName;
    a.click();
  }

  watch(() => toValue(documentId), load, { immediate: true });
  onScopeDispose(revoke);

  return { url, mime, loading, error, reload: load, download };
}
