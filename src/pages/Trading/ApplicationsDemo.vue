<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { FileCheck2 } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import ClientPicker from '@/components/sales/ClientPicker.vue';
import ClientFormModal from '@/components/sales/ClientFormModal.vue';
import ApplicationResult from '@/components/trading/ApplicationResult.vue';
import PlatformPicker from '@/components/trading/PlatformPicker.vue';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { useCountries } from '@/queries/reference';
import { useSubmitApplication } from '@/queries/applications';
import { isApiError } from '@/services/api';
import type { Client } from '@/types/sales';
import type { ApplicationSubmission } from '@/types/applications';

/* Demo Application — the CRM's reproduction of the public Website demo form
 * (matchsec_application open_demo_account.php, ACTIVE fields only). The
 * payload keeps the website field names (purpose/platform=1/2, firstname,
 * email2, agreecom, …) and is validated by the same WebsiteApplicationRequest
 * ruleset, then submitted through the SAME intake service the website uses —
 * there is no second business path. The reference + lifecycle shown after
 * submission are the shared service's own response. */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const canDemo = computed(() => auth.can('trading.applications.demo.create'));

const submit = useSubmitApplication();
const result = ref<ApplicationSubmission | null>(null);
const fieldErrors = reactive<Record<string, string[]>>({});

// Optional: attach to an existing CRM client. When left empty the applicant
// contact resolves/creates a client exactly as the public website does
// (contact-only clients are allowed; a Lead is never fabricated).
const client = ref<Client | null>(null);
const clientModalOpen = ref(false);

const countries = useCountries(() => ({ 'filter[is_active]': 1 }));

const emptyForm = () => ({
  firstname: '',
  lastname: '',
  email: '',
  email2: '',
  country: '',
  callcode: '',
  phone: '',
  agreecom: false,
  // Legacy Website hidden-input value (1=MT4, 2=MT5). Starts empty and is
  // defaulted by PlatformPicker from the ACTIVE platforms only, so a retired
  // platform (MT4) can never be the pre-selected default.
  platform: '' as string,
  referral_code: '',
});

const form = reactive(emptyForm());

// Generated per form session and reused across retries — a double-click or
// network retry replays the original application instead of duplicating it.
// A deliberate new application (after Reset) gets a fresh key.
const idempotencyKey = ref(`crm-demo-${crypto.randomUUID()}`);

// The website pairs the country select with a hidden call code.
watch(
  () => form.country,
  (iso2) => {
    const country = (countries.data.value ?? []).find((c) => c.iso2 === iso2);
    form.callcode = (country?.phone_code ?? '').replace(/\D/g, '');
  },
);

const emailMismatch = computed(
  () => form.email2.trim() !== '' && form.email2.trim() !== form.email.trim(),
);

// Mirrors the deployed website demo form's required set: name, email
// (confirmed), country and phone. Kept in lockstep with the `*` markers below.
const valid = computed(
  () =>
    form.firstname.trim() !== '' &&
    form.lastname.trim() !== '' &&
    form.email.trim() !== '' &&
    form.country !== '' &&
    form.phone.trim() !== '' &&
    // The platform is no longer hardcoded: PlatformPicker fills it in from
    // the ACTIVE list once it loads. Until then there is nothing valid to
    // submit, and an empty value would be rejected server-side.
    form.platform !== '' &&
    !emailMismatch.value,
);

function onClientCreated(created: Client) {
  client.value = created;
}

function onSubmit() {
  if (!valid.value || submit.isPending.value) return;
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k]);

  const payload: Record<string, unknown> = {
    // --- verbatim website demo fields -------------------------------------
    purpose: 'Demo',
    platform: form.platform, // '1' | '2' — the legacy numeric the site posts
    firstname: form.firstname.trim(),
    lastname: form.lastname.trim(),
    email: form.email.trim(),
    email2: form.email2.trim(),
    country: form.country, // ISO2, as posted by the site
    phone: form.phone.trim(),
    callcode: form.callcode,
    agreecom: form.agreecom ? '1' : '',
    referral_code: form.referral_code.trim(),
    site_src: 'crm-applications',
    site_url: window.location.href,
    // --- CRM-side hygiene ---------------------------------------------------
    idempotency_key: idempotencyKey.value,
  };
  if (client.value) payload.client_id = client.value.id;

  submit.mutate(payload, {
    onSuccess: (data) => {
      toast.success(
        data.replayed ? 'Application already received' : 'Demo application received',
        `Reference ${data.reference}`,
      );
      result.value = data;
    },
    onError: (e) => {
      if (isApiError(e)) {
        Object.assign(fieldErrors, e.errors ?? {});
        toast.fromError(e, 'Could not submit the application');
      }
    },
  });
}

function reset() {
  Object.assign(form, emptyForm());
  client.value = null;
  result.value = null;
  idempotencyKey.value = `crm-demo-${crypto.randomUUID()}`;
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header class="flex items-center gap-2.5">
        <FileCheck2 class="size-5 text-primary" />
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-fg">Demo Application</h1>
          <p class="text-sm text-muted">
            Same form and intake path as the public website's demo application.
          </p>
        </div>
      </header>

      <div
        v-if="!canDemo"
        class="rounded-md border border-border bg-muted-surface/50 p-4 text-sm text-muted"
        data-testid="demo-forbidden"
      >
        You do not have permission to submit demo applications
        (trading.applications.demo.create).
      </div>

      <!-- SUCCESS: the shared intake response -->
      <template v-else-if="result">
        <ApplicationResult :result="result" />
        <div class="flex justify-end">
          <Button variant="outline" size="sm" data-testid="demo-reset" @click="reset">
            New application
          </Button>
        </div>
      </template>

      <!-- FORM: mirrors the active public website demo form -->
      <form v-else class="space-y-5" novalidate @submit.prevent="onSubmit">
        <section class="space-y-4 rounded-md border border-border bg-surface p-4">
          <h2 class="text-sm font-semibold text-fg">Applicant</h2>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-fg">
                First name <span class="text-status-danger">*</span>
              </label>
              <Input
                v-model="form.firstname"
                data-testid="demo-firstname"
                placeholder="As per passport"
                :invalid="!!fieldErrors.firstname || !!fieldErrors.first_name"
              />
              <p v-if="fieldErrors.firstname || fieldErrors.first_name" class="text-xs text-status-danger">
                {{ (fieldErrors.firstname ?? fieldErrors.first_name)![0] }}
              </p>
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-fg">
                Last name <span class="text-status-danger">*</span>
              </label>
              <Input
                v-model="form.lastname"
                data-testid="demo-lastname"
                placeholder="As per passport"
                :invalid="!!fieldErrors.lastname || !!fieldErrors.last_name"
              />
              <p v-if="fieldErrors.lastname || fieldErrors.last_name" class="text-xs text-status-danger">
                {{ (fieldErrors.lastname ?? fieldErrors.last_name)![0] }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-fg">
                Email <span class="text-status-danger">*</span>
              </label>
              <Input
                v-model="form.email"
                data-testid="demo-email"
                type="email"
                placeholder="name@example.com"
                :invalid="!!fieldErrors.email"
              />
              <p v-if="fieldErrors.email" class="text-xs text-status-danger">{{ fieldErrors.email[0] }}</p>
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-fg">
                Confirm email <span class="text-status-danger">*</span>
              </label>
              <Input
                v-model="form.email2"
                data-testid="demo-email2"
                type="email"
                placeholder="Repeat the email"
                :invalid="emailMismatch || !!fieldErrors.email_confirmation"
              />
              <p v-if="emailMismatch" class="text-xs text-status-danger">Emails do not match.</p>
              <p v-else-if="fieldErrors.email_confirmation" class="text-xs text-status-danger">
                {{ fieldErrors.email_confirmation[0] }}
              </p>
            </div>
          </div>
        </section>

        <section class="space-y-4 rounded-md border border-border bg-surface p-4">
          <h2 class="text-sm font-semibold text-fg">Contact</h2>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-fg">
                Country <span class="text-status-danger">*</span>
              </label>
              <select
                v-model="form.country"
                data-testid="demo-country"
                class="h-9 w-full rounded-md border border-input bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select country…</option>
                <option v-for="c in countries.data.value ?? []" :key="c.id" :value="c.iso2">
                  {{ c.name }}
                </option>
              </select>
              <p v-if="fieldErrors.country_id" class="text-xs text-status-danger">{{ fieldErrors.country_id[0] }}</p>
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-fg">
                Mobile <span class="text-status-danger">*</span>
              </label>
              <Input
                v-model="form.phone"
                data-testid="demo-phone"
                placeholder="Mobile number"
                :invalid="!!fieldErrors.mobile"
              />
              <p v-if="fieldErrors.mobile" class="text-xs text-status-danger">{{ fieldErrors.mobile[0] }}</p>
              <p v-else class="text-xs text-muted">Dialling code {{ form.callcode || '—' }} is applied from the country.</p>
            </div>
          </div>
        </section>

        <PlatformPicker
          v-model="form.platform"
          testid-prefix="demo"
          required="trading.applications.demo.create"
        />

        <!-- Deliberately collapsed and optional: the form is the entry point, an
             applicant never has to pick a Client ID first. Left empty, the
             contact resolves/creates the client exactly as the website does. -->
        <details class="rounded-md border border-border bg-surface p-4">
          <summary
            class="cursor-pointer text-sm font-medium text-muted hover:text-fg"
            data-testid="demo-linkage-toggle"
          >
            Advanced — link to an existing CRM client (optional)
          </summary>
          <div class="mt-3 space-y-2">
            <p class="text-xs text-muted">
              Leave empty to let the applicant's contact resolve or create the client exactly
              as the public website does. A Lead is never fabricated.
            </p>
            <ClientPicker
              v-model="client"
              data-testid="demo-client-picker"
              placeholder="Attach an existing client…"
              @add-new="clientModalOpen = true"
            />
          </div>
        </details>

        <section class="space-y-3 rounded-md border border-border bg-surface p-4">
          <label class="flex items-start gap-2 text-sm text-fg" data-testid="demo-agreecom-row">
            <input v-model="form.agreecom" type="checkbox" class="mt-0.5" data-testid="demo-agreecom" />
            <span>
              “Do not use my information” consent (agreecom)
              <span class="text-muted">— captured on the public form as well.</span>
            </span>
          </label>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-fg">Referral code</label>
            <Input
              v-model="form.referral_code"
              data-testid="demo-referral"
              placeholder="Hidden on the website (query param); enter if known"
              :invalid="!!fieldErrors.reference"
            />
          </div>
        </section>

        <div class="flex justify-end">
          <Button
            type="submit"
            data-testid="demo-submit"
            :disabled="!valid"
            :loading="submit.isPending.value"
          >
            Submit demo application
          </Button>
        </div>
      </form>
    </div>

    <ClientFormModal v-model:open="clientModalOpen" @created="onClientCreated" />
  </AppLayout>
</template>
