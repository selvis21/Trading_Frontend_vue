<script setup lang="ts">
import { ref } from 'vue';
import { router } from '@inertiajs/vue3';
import { LogIn } from '@lucide/vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';

defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();

const email = ref('');
const password = ref('');
const loading = ref(false);
const fieldErrors = ref<Record<string, string[]>>({});

async function submit() {
  loading.value = true;
  fieldErrors.value = {};
  try {
    await auth.login(email.value, password.value);
    toast.success('Welcome back');
    router.visit(auth.postLoginTarget());
  } catch (e) {
    if (isApiError(e)) {
      fieldErrors.value = e.errors ?? {};
      toast.fromError(e, 'Could not sign in');
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout>
    <div class="mb-8">
      <h1 class="text-xl font-semibold text-fg">Sign in</h1>
      <p class="mt-1 text-sm text-muted">
        Enter your credentials to access the console.
      </p>
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <div class="space-y-1.5">
        <label for="email" class="text-sm font-medium text-fg">Email</label>
        <Input
          id="email"
          v-model="email"
          type="email"
          placeholder="you@brokerage.com"
          :invalid="!!fieldErrors.email"
          autocomplete="email"
        />
        <p v-if="fieldErrors.email" class="text-xs text-status-danger">
          {{ fieldErrors.email[0] }}
        </p>
      </div>

      <div class="space-y-1.5">
        <label for="password" class="text-sm font-medium text-fg">Password</label>
        <Input
          id="password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          :invalid="!!fieldErrors.password"
          autocomplete="current-password"
        />
        <p v-if="fieldErrors.password" class="text-xs text-status-danger">
          {{ fieldErrors.password[0] }}
        </p>
      </div>

      <Button type="submit" class="w-full" :loading="loading">
        <LogIn v-if="!loading" />
        Sign in
      </Button>
    </form>
  </AuthLayout>
</template>
