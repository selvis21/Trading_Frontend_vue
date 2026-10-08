<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { CircleUserRound, Server, Layers, Gauge, AlertTriangle } from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import AccountTypePill from './AccountTypePill.vue';
import LifecycleContext from './LifecycleContext.vue';
import SelectedClientCard from './SelectedClientCard.vue';
import ClientPicker from '@/components/sales/ClientPicker.vue';
import ClientFormModal from '@/components/sales/ClientFormModal.vue';
import { cn } from '@/lib/utils';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import {
  useTradingPlatforms,
  useTradingGroups,
  useCreateAccountRequest,
  useTradingLifecycle,
} from '@/queries/trading';
import { useClientDetail } from '@/queries/clients';
import type { TradingAccountType } from '@/types/trading';
import type { Client } from '@/types/sales';

/* Account-creation workflow: submit an open-account request for a client.
 *
 * Client-first: the operator searches for (or creates) a Client instead of
 * typing a raw numeric id. The client id is still what the API receives, it
 * is just no longer the presented identity. Lifecycle context for the
 * selected client comes from the backend read-model, so the drawer reflects
 * the real stage / next actions / pending applications.
 *
 * Platform → group → type → leverage, with a review summary. The request
 * lands pending in the queue for an operator to approve (which provisions the
 * account). KYC is enforced server-side at approval time. */
const props = defineProps<{
  open: boolean;
  /** Pre-fill (and lock) the client when launched from a client context. */
  clientId?: number | null;
}>();
const emit = defineEmits<{ 'update:open': [v: boolean]; created: [] }>();

const toast = useToast();
const auth = useAuthStore();
const platforms = useTradingPlatforms(true);
const create = useCreateAccountRequest();

const selected = ref<Client | null>(null);
const clientModalOpen = ref(false);
const platformId = ref<number | null>(null);
const groupId = ref<number | null>(null);
const accountType = ref<TradingAccountType>('live');
const leverage = ref<number | null>(100);

const locked = computed(() => !!props.clientId);

/** Client detail for the locked (launch-from-profile) case. */
const detail = useClientDetail(() => props.clientId ?? null);

/** Backend lifecycle read-model for the selected client. */
const lifecycle = useTradingLifecycle(() => selected.value?.id ?? null);
const canSeeLifecycle = computed(() => auth.can('trading.view'));

/** Account types this client already has a pending application for. */
const pendingTypes = computed<Set<TradingAccountType>>(() => {
  const apps = lifecycle.data.value?.applications ?? [];
  return new Set(
    apps
      .filter((a) => a.status === 'pending' && a.account_type)
      .map((a) => a.account_type as TradingAccountType),
  );
});
const typeBlocked = computed(
  () => !!selected.value && pendingTypes.value.has(accountType.value),
);
/** Types the backend already has a pending application for (info + gating). */
const blockedTypes = computed<TradingAccountType[]>(() => [...pendingTypes.value]);

const groupParams = computed(() => ({
  trading_platform_id: platformId.value ?? undefined,
  account_kind: accountType.value,
  active: true,
}));
const groups = useTradingGroups(groupParams);

const types: TradingAccountType[] = ['demo', 'live', 'ib'];

// Reset on open; default the platform once the reference data lands.
watch(
  () => props.open,
  (o) => {
    if (!o) return;
    selected.value = props.clientId ? (detail.data.value ?? null) : null;
    platformId.value = platforms.data.value?.[0]?.id ?? null;
    groupId.value = null;
    accountType.value = 'live';
    leverage.value = 100;
    clientModalOpen.value = false;
  },
);
// Locked client detail arrives (or is refetched) after the drawer opens.
watch(
  () => detail.data.value,
  (client) => {
    if (props.open && props.clientId && client) selected.value = client;
  },
);
watch(
  () => platforms.data.value,
  (list) => {
    if (props.open && platformId.value === null && list?.length) {
      platformId.value = list[0].id;
    }
  },
);
// A group choice must belong to the selected platform/type — clear on change.
watch([platformId, accountType], () => (groupId.value = null));

const leverageValid = computed(
  () =>
    leverage.value === null ||
    (Number.isInteger(leverage.value) && leverage.value >= 1 && leverage.value <= 5000),
);
const valid = computed(
  () =>
    !!selected.value &&
    !!platformId.value &&
    leverageValid.value &&
    !typeBlocked.value,
);

/** The new client created inline is selected automatically. */
function onClientCreated(client: Client) {
  selected.value = client;
  clientModalOpen.value = false;
}

function clearSelection() {
  selected.value = null;
}

function submit() {
  if (!valid.value || !selected.value || !platformId.value) return;
  create.mutate(
    {
      clientId: selected.value.id,
      payload: {
        trading_platform_id: platformId.value,
        trading_group_id: groupId.value,
        account_type: accountType.value,
        requested_leverage: leverage.value,
      },
    },
    {
      onSuccess: () => {
        toast.success('Open-account request submitted');
        emit('created');
        emit('update:open', false);
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

const field = 'w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="32rem"
    title="New trading account"
    description="Select a client, then request an account for operator approval."
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5">
      <!-- client -->
      <div class="space-y-1.5">
        <label class="flex items-center gap-1.5 text-sm font-medium text-fg">
          <CircleUserRound class="size-4 text-muted" /> Client
        </label>

        <SelectedClientCard
          v-if="selected"
          :client="selected"
          :loading="locked && detail.isLoading.value"
          :locked="locked"
          @change="clearSelection"
        />

        <template v-else>
          <ClientPicker v-model="selected" @add-new="clientModalOpen = true" />
          <p class="text-xs text-muted">
            Search by name, email, mobile or client code — or create the client now.
          </p>
        </template>
      </div>

      <!-- lifecycle context (backend read-model) -->
      <LifecycleContext
        v-if="selected && canSeeLifecycle"
        :lifecycle="lifecycle.data.value ?? null"
        :loading="lifecycle.isLoading.value"
      />

      <div class="border-t border-border pt-4">
        <div class="space-y-1.5">
          <label class="flex items-center gap-1.5 text-sm font-medium text-fg">
            <Server class="size-4 text-muted" /> Platform
          </label>
          <select v-model.number="platformId" :class="field" :disabled="!selected">
            <option v-for="p in platforms.data.value ?? []" :key="p.id" :value="p.id">
              {{ p.name }} ({{ p.code }})
            </option>
          </select>
        </div>

        <!-- account type -->
        <div class="mt-4 space-y-1.5">
          <span class="text-sm font-medium text-fg">Account type</span>
          <div class="flex gap-2">
            <button
              v-for="t in types"
              :key="t"
              type="button"
              :disabled="!selected || pendingTypes.has(t)"
              :title="
                !selected
                  ? 'Select a client first'
                  : pendingTypes.has(t)
                    ? 'This client already has a pending application of this type'
                    : undefined
              "
              :class="
                cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  accountType === t ? 'border-primary bg-primary/5 text-fg' : 'border-border text-muted hover:bg-muted-surface',
                  (!selected || pendingTypes.has(t)) && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                )
              "
              @click="accountType = t"
            >
              <AccountTypePill :type="t" />
            </button>
          </div>
          <p v-if="selected && blockedTypes.length" class="flex items-center gap-1.5 text-xs text-status-warning">
            <AlertTriangle class="size-3.5" />
            This client already has a pending {{ blockedTypes.join(' + ') }} application — choose another type.
          </p>
        </div>

        <!-- group -->
        <div class="mt-4 space-y-1.5">
          <label class="flex items-center gap-1.5 text-sm font-medium text-fg">
            <Layers class="size-4 text-muted" /> Group <span class="text-muted">(optional)</span>
          </label>
          <select v-model.number="groupId" :class="field" :disabled="!groups.data.value?.length">
            <option :value="null">Operator assigns on approval</option>
            <option v-for="g in groups.data.value ?? []" :key="g.id" :value="g.id">
              {{ g.name }}<span v-if="g.default_leverage"> · 1:{{ g.default_leverage }}</span>
            </option>
          </select>
        </div>

        <!-- leverage -->
        <div class="mt-4 space-y-1.5">
          <label class="flex items-center gap-1.5 text-sm font-medium text-fg">
            <Gauge class="size-4 text-muted" /> Requested leverage
          </label>
          <input
            v-model.number="leverage"
            type="number"
            min="1"
            max="5000"
            step="1"
            inputmode="numeric"
            :disabled="!selected"
            :class="cn(field, 'tabular-nums', !leverageValid && 'border-status-danger')"
          />
          <p v-if="!leverageValid" class="text-xs text-status-danger">Leverage must be between 1 and 5000.</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
        <Button size="sm" :disabled="!valid" :loading="create.isPending.value" @click="submit">
          Submit request
        </Button>
      </div>
    </template>
  </Sheet>

  <!-- contact-only client creation, stacked above the drawer (Modal z-80) -->
  <ClientFormModal
    :open="clientModalOpen"
    @update:open="clientModalOpen = $event"
    @created="onClientCreated"
  />
</template>
