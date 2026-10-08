import { toast } from 'vue-sonner';
import { isApiError } from '@/services/api';

/* Thin wrapper over vue-sonner so the rest of the app has one toast API. */
export function useToast() {
  return {
    success: (message: string, description?: string) =>
      toast.success(message, { description }),
    error: (message: string, description?: string) =>
      toast.error(message, { description }),
    info: (message: string, description?: string) =>
      toast(message, { description }),
    warning: (message: string, description?: string) =>
      toast.warning(message, { description }),
    loading: (message: string) => toast.loading(message),
    dismiss: (id?: string | number) => toast.dismiss(id),
    promise: toast.promise,
    /** Surface a normalised ApiError (incl. 422 field errors) as a toast. */
    fromError: (error: unknown, fallback = 'Something went wrong') => {
      if (isApiError(error)) {
        const first = error.errors
          ? Object.values(error.errors)[0]?.[0]
          : undefined;
        toast.error(error.message || fallback, { description: first });
      } else {
        toast.error(fallback);
      }
    },
  };
}
