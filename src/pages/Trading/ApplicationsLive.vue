<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { FileWarning } from '@lucide/vue';
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
import {
  WEBSITE_JOB_STATUS_OPTIONS,
  WEBSITE_NET_WORTH_OPTIONS,
  WEBSITE_SOURCE_OF_WEALTH_OPTIONS,
} from '@/types/applications';

/* Live Application — the CRM's reproduction of the public Website live form
 * (matchsec_application open_live_account.php). The DEPLOYED live form
 * actively collects identity + contact only (the questionnaire, tax-residence
 * and financial sections exist in the Accounts.php controller but are
 * commented out in the view), so those are the required fields here. The
 * optional qstn[] extras below map onto the r[] array that controller still
 * reads, using the website's own option values. Submission runs through the
 * SAME intake service as the public site — reference, duplicate protection
 * and the honest "not scored yet" Application Score state all come from the
 * backend, never invented in the UI. */
defineOptions({ layout: null });

const auth = useAuthStore();
const toast = useToast();
const canLive = computed(() => auth.can('trading.applications.live.create'));

const submit = useSubmitApplication();
const result = ref<ApplicationSubmission | null>(null);
const fieldErrors = reactive<Record<string, string[]>>({});

const client = ref<Client | null>(null);
const clientModalOpen = ref(false);

const countries = useCountries(() => ({ 'filter[is_active]': 1 }));

const emptyForm = () => ({
  firstname: '',
  lastname: '',
  email: '',
  confirm_email: '',
  country: '',
  callcode: '',
  phone: '',
  // Legacy Website hidden-input value (1=MT4, 2=MT5). Starts empty and is
  // defaulted by PlatformPicker from the ACTIVE platforms only.
  platform: '' as string,
  agree: false,
  // Optional r[] questionnaire extras (all optional — the deployed site does
  // not actively collect them either):
  passport_no: '',
  annual_income: '',
  job_status: '',
  estimated_net_worth: '',
  source_of_wealth: [] as string[],
  declaration_name: '',
  declaration_sign: '',
  declaration_date: '',
});

const form = reactive(emptyForm());

const idempotencyKey = ref(`crm-live-${crypto.randomUUID()}`);

watch(
  () => form.country,
  (iso2) => {
    const country = (countries.data.value ?? []).find((c) => c.iso2 === iso2);
    form.callcode = (country?.phone_code ?? '').replace(/\D/g, '');
  },
);

const emailMismatch = computed(
  () => form.confirm_email.trim() !== '' && form.confirm_email.trim() !== form.email.trim(),
);

// Mirrors the deployed website live form's required set: name, email
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

  // r[] — only the extras the operator actually filled (the legacy controller
  // maps the whole r[] array; declaration* keys land as declarations).
  const qstn: Record<string, unknown> = {};
  if (form.passport_no.trim()) qstn.passport_no = form.passport_no.trim();
  if (form.annual_income.trim()) qstn.annual_income = form.annual_income.trim();
  if (form.job_status) qstn.job_status = form.job_status;
  if (form.estimated_net_worth) qstn.estimated_net_worth = form.estimated_net_worth;
  if (form.source_of_wealth.length) qstn.source_of_wealth = [...form.source_of_wealth];
  if (form.declaration_name.trim()) qstn.declaration_name = form.declaration_name.trim();
  if (form.declaration_sign.trim()) qstn.declaration_sign = form.declaration_sign.trim();
  if (form.declaration_date.trim()) qstn.declaration_date = form.declaration_date.trim();

  const payload: Record<string, unknown> = {
    // --- verbatim website live fields -------------------------------------
    purpose: 'Live',
    platform: form.platform,
    firstname: form.firstname.trim(),
    lastname: form.lastname.trim(),
    email: form.email.trim(),
    confirm_email: form.confirm_email.trim(),
    country: form.country,
    phone: form.phone.trim(),
    callcode: form.callcode,
    agree: form.agree ? '1' : '',
    client_classification_status: 'retail', // the site's hidden constant
    like_to_trade: 'forex', // the site's hidden constant
    site_src: 'crm-applications',
    site_url: window.location.href,
    // --- CRM-side hygiene ---------------------------------------------------
    idempotency_key: idempotencyKey.value,
  };
  if (Object.keys(qstn).length) payload.qstn = qstn;
  if (client.value) payload.client_id = client.value.id;

  submit.mutate(payload, {
    onSuccess: (data) => {
      toast.success(
        data.replayed ? 'Application already received' : 'Live application received',
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
  idempotencyKey.value = `crm-live-${crypto.randomUUID()}`;
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header class="flex items-center gap-2.5">
        <FileWarning class="size-5 text-primary" />
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-fg">Live Application</h1>
          <p class="text-sm text-muted">
            Same form and intake path as the public website's live application
            (real-money account; Application Score applies).
          </p>
        </div>
      </header>

      <div
        v-if="!canLive"
        class="rounded-md border border-border bg-muted-surface/50 p-4 text-sm text-muted"
        data-testid="live-forbidden"
      >
        You do not have permission to submit live applications
        (trading.applications.live.create).
      </div>

      <template v-else-if="result">
        <ApplicationResult :result="result" />

        <!-- Honest Application Score state: the CRM has not configured scoring
             criteria, and the backend reports no score — nothing is invented. -->
        <div
          class="rounded-md border border-border bg-muted-surface/50 p-3 text-sm text-muted"
          data-testid="live-score-honest"
        >
          Application Score: <span class="font-medium text-fg">not scored yet</span> — a reviewer
          scores the application from the request queue; no score is assigned at submission.
        </div>

        <div class="flex justify-end">
          <Button variant="outline" size="sm" data-testid="live-reset" @click="reset">
            New application
          </Button>
        </div>
      </template>

      <form v-else class="space-y-5" novalidate @submit.prevent="onSubmit">
        <section class="space-y-4 rounded-md border border-border bg-surface p-4">
          <h2 class="text-sm font-semibold text-fg">Applicant (as per passport)</h2>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-fg">
                First name <span class="text-status-danger">*</span>
              </label>
              <Input
                v-model="form.firstname"
                data-testid="live-firstname"
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
                data-testid="live-lastname"
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
                data-testid="live-email"
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
                v-model="form.confirm_email"
                data-testid="live-confirm-email"
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
          <h2 class="text-sm font-semibold text-fg">Residence &amp; contact</h2>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-fg">
                Country of residence <span class="text-status-danger">*</span>
              </label>
              <select
                v-model="form.country"
                data-testid="live-country"
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
                data-testid="live-phone"
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
          testid-prefix="live"
          required="trading.applications.live.create"
        />

        <!-- Deliberately collapsed and optional: the form is the entry point, an
             applicant never has to pick a Client ID first. Left empty, the
             contact resolves/creates the client exactly as the website does. -->
        <details class="rounded-md border border-border bg-surface p-4">
          <summary
            class="cursor-pointer text-sm font-medium text-muted hover:text-fg"
            data-testid="live-linkage-toggle"
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
              placeholder="Attach an existing client…"
              @add-new="clientModalOpen = true"
            />
          </div>
        </details>

        <section class="space-y-4 rounded-md border border-border bg-surface p-4">
          <div>
            <h2 class="text-sm font-semibold text-fg">Questionnaire (optional)</h2>
            <p class="text-xs text-muted">
              The deployed website form does not actively collect these; they are offered here
              with the website's own option values and stored through the same r[] mapping.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-fg">Passport number</label>
                <Input v-model="form.passport_no" data-testid="live-passport" placeholder="e.g. P1234567" />
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-fg">Annual income (USD)</label>
                <Input v-model="form.annual_income" data-testid="live-income" placeholder="Numeric" />
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-fg">Employment status</label>
                <select
                  v-model="form.job_status"
                  data-testid="live-job-status"
                  class="h-9 w-full rounded-md border border-input bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select…</option>
                  <option v-for="opt in WEBSITE_JOB_STATUS_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-fg">Estimated net worth</label>
                <select
                  v-model="form.estimated_net_worth"
                  data-testid="live-net-worth"
                  class="h-9 w-full rounded-md border border-input bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select…</option>
                  <option v-for="opt in WEBSITE_NET_WORTH_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <div class="space-y-1.5">
              <p class="text-sm font-medium text-fg">Source of wealth</p>
              <div class="flex flex-wrap gap-x-4 gap-y-1.5">
                <label
                  v-for="opt in WEBSITE_SOURCE_OF_WEALTH_OPTIONS"
                  :key="opt"
                  class="flex items-center gap-1.5 text-sm text-fg"
                >
                  <input
                    v-model="form.source_of_wealth"
                    type="checkbox"
                    :value="opt"
                    :data-testid="`live-sow-${opt.toLowerCase().replace(/[^a-z]+/g, '-')}`"
                  />
                  {{ opt }}
                </label>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-fg">Declaration name</label>
                <Input v-model="form.declaration_name" placeholder="Full name" />
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-fg">Declaration signature</label>
                <Input v-model="form.declaration_sign" placeholder="Typed signature" />
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-fg">Declaration date</label>
                <Input v-model="form.declaration_date" type="date" />
              </div>
            </div>
        </section>

        <section class="space-y-3 rounded-md border border-border bg-surface p-4">
          <label class="flex items-start gap-2 text-sm text-fg" data-testid="live-agree-row">
            <input v-model="form.agree" type="checkbox" class="mt-0.5" data-testid="live-agree" />
            <span>
              I agree to the terms, risk disclosure and privacy policy
              <span class="text-muted">— captured as the website's `agree` declaration.</span>
            </span>
          </label>
        </section>

        <div class="flex justify-end">
          <Button
            type="submit"
            data-testid="live-submit"
            :disabled="!valid"
            :loading="submit.isPending.value"
          >
            Submit live application
          </Button>
        </div>
      </form>
    </div>

    <ClientFormModal v-model:open="clientModalOpen" @created="onClientCreated" />
  </AppLayout>
</template>
