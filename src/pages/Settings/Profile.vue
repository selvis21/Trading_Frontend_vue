<script setup lang="ts">
import { reactive, watch } from 'vue';
import SettingsLayout from '@/layouts/SettingsLayout.vue';
import SettingsCard from '@/components/settings/SettingsCard.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import Avatar from '@/components/ui/Avatar.vue';
import RoleBadge from '@/components/auth/RoleBadge.vue';
import Badge from '@/components/ui/Badge.vue';
import { useAuthStore } from '@/stores/auth';
import { useUpdateProfile } from '@/queries/profile';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';

defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const update = useUpdateProfile();

const form = reactive({
  first_name: auth.user?.first_name ?? '',
  last_name: auth.user?.last_name ?? '',
  email: auth.user?.email ?? '',
  phone: auth.user?.phone ?? '',
});
const errors = reactive<Record<string, string[]>>({});

// Keep form seeded if the session hydrates after mount.
watch(
  () => auth.user,
  (u) => {
    if (!u) return;
    form.first_name = u.first_name;
    form.last_name = u.last_name;
    form.email = u.email;
    form.phone = u.phone ?? '';
  },
);

function save() {
  Object.keys(errors).forEach((k) => delete errors[k]);
  update.mutate(
    { ...form },
    {
      onSuccess: () => toast.success('Profile updated'),
      onError: (e) => {
        if (isApiError(e)) {
          Object.assign(errors, e.errors ?? {});
          toast.fromError(e, 'Could not update profile');
        }
      },
    },
  );
}
</script>

<template>
  <SettingsLayout>
    <SettingsCard
      title="Profile"
      description="Your personal details, visible to your team."
    >
      <SettingsRow title="Avatar" description="Generated from your name.">
        <Avatar :name="auth.user?.name" :src="auth.user?.avatar_path" size="lg" />
      </SettingsRow>

      <SettingsRow title="First name">
        <div class="w-64 max-w-full">
          <Input v-model="form.first_name" :invalid="!!errors.first_name" />
          <p v-if="errors.first_name" class="mt-1 text-xs text-status-danger">
            {{ errors.first_name[0] }}
          </p>
        </div>
      </SettingsRow>

      <SettingsRow title="Last name">
        <div class="w-64 max-w-full">
          <Input v-model="form.last_name" :invalid="!!errors.last_name" />
          <p v-if="errors.last_name" class="mt-1 text-xs text-status-danger">
            {{ errors.last_name[0] }}
          </p>
        </div>
      </SettingsRow>

      <SettingsRow title="Email">
        <div class="w-64 max-w-full">
          <Input v-model="form.email" type="email" :invalid="!!errors.email" />
          <p v-if="errors.email" class="mt-1 text-xs text-status-danger">
            {{ errors.email[0] }}
          </p>
        </div>
      </SettingsRow>

      <SettingsRow title="Phone">
        <div class="w-64 max-w-full">
          <Input v-model="form.phone" :invalid="!!errors.phone" />
        </div>
      </SettingsRow>

      <template #footer>
        <Button :loading="update.isPending.value" @click="save">
          Save changes
        </Button>
      </template>
    </SettingsCard>

    <SettingsCard
      title="Access"
      description="Your roles and data-scope level. Managed by an administrator."
    >
      <SettingsRow title="Roles">
        <RoleBadge :roles="auth.user?.roles ?? []" />
      </SettingsRow>
      <SettingsRow
        title="Access level"
        description="Lower levels see more of the organisation."
      >
        <Badge tone="info">
          {{ auth.user?.level_label ?? `Level ${auth.user?.level}` }}
        </Badge>
      </SettingsRow>
      <SettingsRow
        v-if="auth.user?.business_unit_id"
        title="Business unit"
      >
        <span class="text-sm text-muted">#{{ auth.user?.business_unit_id }}</span>
      </SettingsRow>
    </SettingsCard>
  </SettingsLayout>
</template>
