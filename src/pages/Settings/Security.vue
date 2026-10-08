<script setup lang="ts">
import { reactive, computed } from 'vue';
import SettingsLayout from '@/layouts/SettingsLayout.vue';
import SettingsCard from '@/components/settings/SettingsCard.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import { useChangePassword } from '@/queries/profile';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const changePassword = useChangePassword();

const form = reactive({
  current_password: '',
  password: '',
  password_confirmation: '',
});
const errors = reactive<Record<string, string[]>>({});

const mismatch = computed(
  () =>
    form.password.length > 0 &&
    form.password_confirmation.length > 0 &&
    form.password !== form.password_confirmation,
);

function submit() {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (mismatch.value) return;
  changePassword.mutate(
    { ...form },
    {
      onSuccess: () => {
        toast.success('Password updated');
        form.current_password = '';
        form.password = '';
        form.password_confirmation = '';
      },
      onError: (e) => {
        if (isApiError(e)) {
          Object.assign(errors, e.errors ?? {});
          toast.fromError(e, 'Could not update password');
        }
      },
    },
  );
}
</script>

<template>
  <SettingsLayout>
    <SettingsCard
      title="Password"
      description="Passwords rotate every 45 days. Choose a strong, unique password."
    >
      <SettingsRow title="Current password">
        <div class="w-64 max-w-full">
          <Input
            v-model="form.current_password"
            type="password"
            autocomplete="current-password"
            :invalid="!!errors.current_password"
          />
          <p
            v-if="errors.current_password"
            class="mt-1 text-xs text-status-danger"
          >
            {{ errors.current_password[0] }}
          </p>
        </div>
      </SettingsRow>

      <SettingsRow title="New password">
        <div class="w-64 max-w-full">
          <Input
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            :invalid="!!errors.password"
          />
          <p v-if="errors.password" class="mt-1 text-xs text-status-danger">
            {{ errors.password[0] }}
          </p>
        </div>
      </SettingsRow>

      <SettingsRow title="Confirm new password">
        <div class="w-64 max-w-full">
          <Input
            v-model="form.password_confirmation"
            type="password"
            autocomplete="new-password"
            :invalid="mismatch"
          />
          <p v-if="mismatch" class="mt-1 text-xs text-status-danger">
            Passwords don’t match.
          </p>
        </div>
      </SettingsRow>

      <template #footer>
        <Button
          :loading="changePassword.isPending.value"
          :disabled="mismatch"
          @click="submit"
        >
          Update password
        </Button>
      </template>
    </SettingsCard>

    <SettingsCard
      title="Session"
      description="Sign out of this device. You’ll need to log in again."
    >
      <SettingsRow title="Current session" :description="auth.user?.email ?? ''">
        <Button variant="outline" @click="auth.logout()">Sign out</Button>
      </SettingsRow>
    </SettingsCard>
  </SettingsLayout>
</template>
