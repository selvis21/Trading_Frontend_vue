<script setup lang="ts">
import { computed, ref } from 'vue';
import { refDebounced } from '@vueuse/core';
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
} from 'reka-ui';
import { Check, Plus, Search, UserSquare } from '@lucide/vue';
import Avatar from '@/components/ui/Avatar.vue';
import { cn } from '@/lib/utils';
import { useClientsList } from '@/queries/clients';
import { useAuthStore } from '@/stores/auth';
import type { Client } from '@/types/sales';

/* Searchable client selector for the client-first account workflow.
 *
 * Server-side search on name / email / mobile / client code (debounced), so
 * the directory is never bulk-loaded. The operator can also start the
 * contact-only client flow in place with "+ Add New Client" — the caller
 * wires that to its creation form and auto-selects the result.
 *
 * IMPORTANT: the content is deliberately NOT portalled to document.body.
 * Inside a Sheet (a modal reka-ui Dialog) the content runs inside a trapped
 * FocusScope, which force-refocuses the dialog whenever focus lands on an
 * element outside it. A body-portalled popover is outside, so the search
 * input could never keep focus and typing went nowhere. Rendering the
 * content inside the dialog keeps it in the same focus scope. Positioning is
 * `position: fixed` (reka-ui default strategy), so the drawer's
 * `overflow-y-auto` does not clip it.
 *
 * The numeric client id is intentionally not the displayed identity; it is
 * carried on the selected object and sent to the API internally. */
const props = defineProps<{
  modelValue: Client | null;
  placeholder?: string;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: Client | null];
  addNew: [];
}>();

const open = ref(false);
const search = ref('');
const debounced = refDebounced(search, 300);

const auth = useAuthStore();

/* POST /clients is gated by `permission:clients.create`, so the affordance is
 * gated by the same permission. Offering it unconditionally handed operators an
 * action that could only ever fail with 403. */
const canCreate = computed(() => auth.can('clients.create'));

const term = computed(() => debounced.value.trim());
const canSearch = computed(() => term.value.length >= 2);
const params = computed(() => ({ search: term.value || undefined, page_size: 8 }));

// Only fetch once the operator has typed a meaningful term.
const list = useClientsList(params, computed(() => open.value && canSearch.value));
const rows = computed(() => list.data.value?.rows ?? []);

const selected = computed(() => props.modelValue);

function display(client: Client): string {
  return client.display_name || client.name || client.client_code || 'Client';
}
function contact(client: Client): string {
  return client.email || client.mobile || '';
}

function pick(client: Client) {
  emit('update:modelValue', client);
  open.value = false;
}

function addNew() {
  open.value = false;
  emit('addNew');
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger
      class="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <template v-if="selected">
        <Avatar :name="display(selected)" size="xs" />
        <span class="min-w-0 flex-1 truncate text-start text-fg">
          {{ display(selected) }}
        </span>
        <Check class="size-4 shrink-0 text-primary" />
      </template>
      <template v-else>
        <Search class="size-4 shrink-0 text-muted" />
        <span class="min-w-0 flex-1 truncate text-start text-muted">
          {{ props.placeholder ?? 'Search client by name, email, mobile, client code…' }}
        </span>
      </template>
    </PopoverTrigger>

    <PopoverContent
      align="start"
      :side-offset="4"
      class="z-[70] w-[min(var(--reka-popover-trigger-width),28rem)] min-w-[20rem] overflow-hidden rounded-md border border-border bg-surface-raised shadow-md data-[state=open]:animate-in data-[state=open]:fade-in"
    >
        <div class="flex items-center gap-2 border-b border-border px-3">
          <Search class="size-4 text-muted" />
          <input
            v-model="search"
            class="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted"
            placeholder="Search clients…"
            autocomplete="off"
          />
        </div>

        <ul class="max-h-64 overflow-y-auto p-1">
          <li v-if="!canSearch" class="px-2 py-3 text-center text-xs text-muted">
            Type at least 2 characters to search (name, email, mobile or client code).
          </li>
          <li v-else-if="list.isLoading.value" class="px-2 py-3 text-center text-sm text-muted">
            Searching…
          </li>
          <li v-else-if="list.isError.value" class="px-2 py-3 text-center text-sm text-status-danger">
            Could not search clients.
          </li>
          <li v-else-if="!rows.length" class="px-2 py-3 text-center text-sm text-muted">
            No clients match “{{ term }}”.
          </li>
          <li v-for="client in rows" :key="client.id">
            <button
              type="button"
              :class="
                cn(
                  'flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted-surface',
                  modelValue?.id === client.id && 'bg-primary/10',
                )
              "
              @click="pick(client)"
            >
              <Avatar :name="display(client)" size="xs" class="mt-0.5" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium text-fg">
                  {{ display(client) }}
                </span>
                <span class="block truncate text-xs text-muted">
                  {{ contact(client) || 'No contact details' }}
                </span>
              </span>
              <span class="mt-0.5 shrink-0 font-mono text-xs text-muted">
                {{ client.client_code ?? '' }}
              </span>
              <Check v-if="modelValue?.id === client.id" class="size-4 shrink-0 text-primary" />
            </button>
          </li>
        </ul>

        <div v-if="canCreate" class="border-t border-border p-1">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-start text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            @click="addNew"
          >
            <Plus class="size-4" /> Add New Client
          </button>
        </div>
      </PopoverContent>
  </PopoverRoot>
</template>
