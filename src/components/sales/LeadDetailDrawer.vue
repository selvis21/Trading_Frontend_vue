<script setup lang="ts">
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui';
import { Link } from '@inertiajs/vue3';
import {
  GitBranch,
  UserPlus,
  Pencil,
  MoreHorizontal,
  ExternalLink,
  UserCheck,
  Waves,
  RotateCcw,
  Ban,
} from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import LeadDetail from './LeadDetail.vue';
import { useAuthStore } from '@/stores/auth';
import { useLead } from '@/queries/leads';

/* Drawer wrapper around LeadDetail with the quick-action toolbar. Action
 * clicks bubble to the page, which owns the sub-drawers (so they stack
 * cleanly over this one). */
const props = defineProps<{ open: boolean; leadId: number | null }>();
const emit = defineEmits<{
  'update:open': [v: boolean];
  track: [];
  assign: [];
  edit: [];
  convert: [];
  abandon: [];
  recover: [];
  blacklist: [];
}>();

const auth = useAuthStore();
const lead = useLead(() => props.leadId);

const menuContent =
  'z-[60] min-w-44 rounded-md border border-border bg-surface-raised p-1 shadow-md';
const menuItem =
  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-fg outline-none data-[highlighted]:bg-muted-surface';
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="40rem"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold text-fg">
            {{ lead.data.value?.name ?? 'Lead' }}
          </h2>
          <p class="truncate text-xs text-muted">
            {{ lead.data.value?.email || lead.data.value?.mobile || '' }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <Button v-if="auth.can('leads.track')" size="sm" variant="outline" @click="emit('track')">
            <GitBranch class="size-4" /> Track
          </Button>
          <Button v-if="auth.can('leads.assign')" size="icon-sm" variant="ghost" aria-label="Assign" @click="emit('assign')">
            <UserPlus class="size-4" />
          </Button>
          <Button v-if="auth.can('leads.update')" size="icon-sm" variant="ghost" aria-label="Edit" @click="emit('edit')">
            <Pencil class="size-4" />
          </Button>
          <DropdownMenuRoot>
            <DropdownMenuTrigger as-child>
              <Button size="icon-sm" variant="ghost" aria-label="More"><MoreHorizontal class="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent align="end" :side-offset="6" :class="menuContent">
                <DropdownMenuItem v-if="auth.can('leads.convert')" :class="menuItem" @click="emit('convert')">
                  <UserCheck class="size-4" /> Convert to client
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-if="auth.can('leads.abandon') && !lead.data.value?.is_abandoned"
                  :class="menuItem"
                  @click="emit('abandon')"
                >
                  <Waves class="size-4" /> Release to pool
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-if="auth.can('leads.abandon') && lead.data.value?.is_abandoned"
                  :class="menuItem"
                  @click="emit('recover')"
                >
                  <RotateCcw class="size-4" /> Recover from pool
                </DropdownMenuItem>
                <DropdownMenuItem v-if="auth.can('leads.update')" :class="menuItem" @click="emit('blacklist')">
                  <Ban class="size-4" /> Toggle blacklist
                </DropdownMenuItem>
                <Link v-if="leadId" :href="`/leads/${leadId}`" :class="menuItem">
                  <ExternalLink class="size-4" /> Open full page
                </Link>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>
      </div>
    </template>

    <div class="-mx-5 -my-4 h-full">
      <LeadDetail v-if="leadId" :key="leadId" :lead-id="leadId" compact />
    </div>
  </Sheet>
</template>
