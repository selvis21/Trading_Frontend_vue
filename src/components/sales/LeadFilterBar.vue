<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'reka-ui';
import { Search, Bookmark, X, SlidersHorizontal, Trash2 } from '@lucide/vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import UserPicker from './UserPicker.vue';
import { useLeadStatuses } from '@/queries/salesReference';
import { useSavedFilters } from '@/composables/useSavedFilters';
import type { LeadFilters } from '@/types/sales';

const props = defineProps<{
  filters: LeadFilters;
  showOwner?: boolean;
}>();
const emit = defineEmits<{ 'update:filters': [value: LeadFilters] }>();

const statuses = useLeadStatuses();
const saved = useSavedFilters();

function patch(part: Partial<LeadFilters>) {
  emit('update:filters', { ...props.filters, ...part });
}

const activeCount = computed(
  () =>
    [
      props.filters.status_id,
      props.filters.owner_id,
      props.filters.type,
      props.filters.is_blacklisted,
    ].filter((v) => v != null).length,
);

function clearAll() {
  emit('update:filters', { search: props.filters.search });
}

const newViewName = ref('');
function saveView() {
  const name = newViewName.value.trim();
  if (!name) return;
  saved.save(name, props.filters);
  newViewName.value = '';
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- quick search -->
    <div class="relative min-w-48 flex-1">
      <Search
        class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
      <Input
        data-global-search
        :model-value="filters.search ?? ''"
        placeholder="Search name, email, mobile…"
        class="ps-8"
        @update:model-value="patch({ search: $event })"
      />
    </div>

    <!-- status -->
    <select
      :value="filters.status_id ?? ''"
      class="h-9 rounded-md border border-input bg-surface px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      @change="patch({ status_id: ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null })"
    >
      <option value="">All statuses</option>
      <option v-for="s in statuses.data.value" :key="s.id" :value="s.id">
        {{ s.name }}
      </option>
    </select>

    <!-- type -->
    <select
      :value="filters.type ?? ''"
      class="h-9 rounded-md border border-input bg-surface px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      @change="patch({ type: (($event.target as HTMLSelectElement).value || null) as LeadFilters['type'] })"
    >
      <option value="">All types</option>
      <option value="retail">Retail</option>
      <option value="ib">IB</option>
    </select>

    <!-- owner -->
    <div v-if="showOwner" class="w-44">
      <UserPicker
        :model-value="filters.owner_id ?? null"
        placeholder="Any owner"
        @update:model-value="patch({ owner_id: $event })"
      />
    </div>

    <Button
      v-if="activeCount > 0"
      variant="ghost"
      size="sm"
      @click="clearAll"
    >
      <X class="size-4" /> Clear ({{ activeCount }})
    </Button>

    <!-- saved views -->
    <DropdownMenuRoot>
      <DropdownMenuTrigger as-child>
        <Button variant="outline" size="sm">
          <Bookmark class="size-4" /> Views
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          :side-offset="6"
          class="z-50 min-w-56 rounded-md border border-border bg-surface-raised p-1 shadow-md"
        >
          <p class="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Saved views
          </p>
          <DropdownMenuItem
            v-for="view in saved.items.value"
            :key="view.id"
            class="group flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-fg outline-none data-[highlighted]:bg-muted-surface"
            @click="emit('update:filters', { ...view.filters })"
          >
            <SlidersHorizontal class="size-3.5 text-muted" />
            <span class="flex-1 truncate">{{ view.name }}</span>
            <button
              class="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Delete view"
              @click.stop="saved.remove(view.id)"
            >
              <Trash2 class="size-3.5 text-muted hover:text-status-danger" />
            </button>
          </DropdownMenuItem>
          <p
            v-if="!saved.items.value.length"
            class="px-2 py-1.5 text-xs text-muted"
          >
            No saved views yet.
          </p>
          <DropdownMenuSeparator class="my-1 h-px bg-border" />
          <div class="flex items-center gap-1 p-1" @click.stop @keydown.stop>
            <Input
              v-model="newViewName"
              placeholder="Save current as…"
              class="h-8 text-xs"
              @keydown.enter="saveView"
            />
            <Button size="sm" :disabled="!newViewName.trim()" @click="saveView">
              Save
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  </div>
</template>
