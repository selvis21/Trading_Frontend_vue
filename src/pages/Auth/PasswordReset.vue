<script setup lang="ts">
import { ref } from 'vue';
import { router } from '@inertiajs/vue3';
import { KeyRound } from '@lucide/vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import { api, isApiError } from '@/services/api';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';

defineOptions({ layout: null });

/* Forced password rotation screen (backend sets must_update_password). */
const toast = useToast();
const auth = useAuthStore();
const current = ref('');
const next = ref('');
const confirm = ref('');
const loading = ref(false);
const errors = ref<Record<string, string[]>>({});

async function submit() {
  loading.value = true;
  errors.value = {};
  try {
    await api.post('/profile/password', {
      current_password: current.value,
      password: next.value,
      password_confirmation: confirm.value,
    });
    auth.mustUpdatePassword = false;
    toast.success('Password updated');
    router.visit('/');
  } catch (e) {
    if (isApiError(e)) {
      errors.value = e.errors ?? {};
      toast.fromError(e, 'Could not update password');
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout>
    <div class="mb-8">
      <h1 class="text-xl font-semibold text-fg">Update your password</h1>
      <p class="mt-1 text-sm text-muted">
        Your password has expired and must be changed before continuing.
      </p>
    </div>
    <form class="space-y-4" @submit.prevent="submit">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Current password</label>
        <Input v-model="current" type="password" :invalid="!!errors.current_password" />
        <p v-if="errors.current_password" class="text-xs text-status-danger">
          {{ errors.current_password[0] }}
        </p>
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">New password</label>
        <Input v-model="next" type="password" :invalid="!!errors.password" />
        <p v-if="errors.password" class="text-xs text-status-danger">
          {{ errors.password[0] }}
        </p>
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Confirm new password</label>
        <Input v-model="confirm" type="password" />
      </div>
      <Button type="submit" class="w-full" :loading="loading">
        <KeyRound v-if="!loading" /> Update password
      </Button>
    </form>
  </AuthLayout>
</template>
