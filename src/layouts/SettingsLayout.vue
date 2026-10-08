<script setup lang="ts">
import { computed } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import { User, SlidersHorizontal, ShieldCheck } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import { cn } from '@/lib/utils';

/* Settings shell: a left sub-nav + content column, nested inside the app
 * shell. Each item is a separate lazily-loaded page/route. */
const page = usePage();
const path = computed(() => page.url.split('?')[0]);

const tabs = [
  { label: 'Profile', href: '/settings/profile', icon: User },
  { label: 'Preferences', href: '/settings/preferences', icon: SlidersHorizontal },
  { label: 'Security', href: '/settings/security', icon: ShieldCheck },
];
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-5xl p-4 sm:p-6">
      <header class="mb-6">
        <h1 class="text-xl font-semibold tracking-tight text-fg">Settings</h1>
        <p class="text-sm text-muted">
          Manage your profile, appearance and security.
        </p>
      </header>

      <div class="flex flex-col gap-6 lg:flex-row">
        <nav class="lg:w-48 lg:shrink-0" aria-label="Settings">
          <ul class="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            <li v-for="t in tabs" :key="t.href">
              <Link
                :href="t.href"
                :class="
                  cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    path === t.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:bg-muted-surface hover:text-fg',
                  )
                "
                :aria-current="path === t.href ? 'page' : undefined"
              >
                <component :is="t.icon" class="size-4" />
                {{ t.label }}
              </Link>
            </li>
          </ul>
        </nav>

        <div class="min-w-0 flex-1 space-y-6">
          <slot />
        </div>
      </div>
    </div>
  </AppLayout>
</template>
