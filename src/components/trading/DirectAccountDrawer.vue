<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { CircleUserRound, Server, Layers, Gauge } from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import AccountTypePill from './AccountTypePill.vue';
import SelectedClientCard from './SelectedClientCard.vue';
import ClientPicker from '@/components/sales/ClientPicker.vue';
import ClientFormModal from '@/components/sales/ClientFormModal.vue';
import { cn } from '@/lib/utils';
import { useToast } from '@/composables/useToast';
import {
  useTradingPlatforms,
  useTradingGroups,
  useCreateAccount,
} from '@/queries/trading';
import { useClientDetail } from '@/queries/clients';
import type { TradingAccountType } from '@/types/trading';
import type { Client } from '@/types/sales';

/* Direct account creation: provisions a trading account for a client
 * immediately, bypassing the request/approval queue. Requires
 * trading.accounts.create. KYC-verified is enforced server-side in the
 * service. Mirrors NewAccountDrawer's client-first selection but posts to the
 * direct creation endpoint (POST /clients/{client}/trading-accounts). */
const props = defineProps<{
  open: boolean;
  /** The client the account is provisioned for (locked when provided). */
  clientId?: number | null;
}>();
const emit = defineEmits<{ 'update:open': [v: boolean]; created: [] }>();

const toast = useToast();
const platforms = useTradingPlatforms(true);
const create = useCreateAccount();

const selected = ref<Client | null>(null);
const clientModalOpen = ref(false);
const platformId = ref<number | null>(null);
const groupId = ref<number | null>(null);
const accountType = ref<TradingAccountType>('live');
const leverage = ref<number | null>(100);

const locked = computed(() => !!props.clientId);
const detail = useClientDetail(() => props.clientId ?? null);

const groupParams = computed(() => ({
  trading_platform_id: platformId.value ?? undefined,
  account_kind: accountType.value,
  active: true,
}));
const groups = useTradingGroups(groupParams);

const types: TradingAccountType[] = ['demo', 'live', 'ib'];

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
watch([platformId, accountType], () => (groupId.value = null));

const leverageValid = computed(
  () =>
    leverage.value === null ||
    (Number.isInteger(leverage.value) && leverage.value >= 1 && leverage.value <= 5000),
);
const valid = computed(
  () => !!selected.value && !!platformId.value && leverageValid.value,
);

function onClientCreated(client: Client) {
  selected.value = client;
  clientModalOpen.value = false;
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
        leverage: leverage.value,
      },
    },
    {
      onSuccess: () => {
        toast.success('Trading account created');
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
    title="Create trading account"
    description="Provision an account directly for this client (bypasses the approval queue). Requires verified KYC."
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
          @change="selected = null"
        />

        <template v-else>
          <ClientPicker v-model="selected" @add-new="clientModalOpen = true" />
          <p class="text-xs text-muted">
            Search by name, email, mobile or client code — or create the client now.
          </p>
        </template>
      </div>

      <!-- platform -->
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
      <div class="space-y-1.5">
        <span class="text-sm font-medium text-fg">Account type</span>
        <div class="flex gap-2">
          <button
            v-for="t in types"
            :key="t"
            type="button"
            :disabled="!selected"
            :class="
              cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                accountType === t ? 'border-primary bg-primary/5 text-fg' : 'border-border text-muted hover:bg-muted-surface',
                !selected && 'cursor-not-allowed opacity-50 hover:bg-transparent',
              )
            "
            @click="accountType = t"
          >
            <AccountTypePill :type="t" />
          </button>
        </div>
      </div>

      <!-- group -->
      <div class="space-y-1.5">
        <label class="flex items-center gap-1.5 text-sm font-medium text-fg">
          <Layers class="size-4 text-muted" /> Group <span class="text-muted">(optional)</span>
        </label>
        <select v-model.number="groupId" :class="field" :disabled="!groups.data.value?.length">
          <option :value="null">Default for platform</option>
          <option v-for="g in groups.data.value ?? []" :key="g.id" :value="g.id">
            {{ g.name }}<span v-if="g.default_leverage"> · 1:{{ g.default_leverage }}</span>
          </option>
        </select>
      </div>

      <!-- leverage -->
      <div class="space-y-1.5">
        <label class="flex items-center gap-1.5 text-sm font-medium text-fg">
          <Gauge class="size-4 text-muted" /> Leverage
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

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
        <Button size="sm" :disabled="!valid" :loading="create.isPending.value" @click="submit">
          Create account
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
