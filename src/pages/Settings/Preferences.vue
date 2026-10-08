<script setup lang="ts">
import { computed } from 'vue';
import { Sun, Moon, Monitor, Rows3, Rows4 } from '@lucide/vue';
import SettingsLayout from '@/layouts/SettingsLayout.vue';
import SettingsCard from '@/components/settings/SettingsCard.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import Switch from '@/components/ui/Switch.vue';
import { useUiStore } from '@/stores/ui';
import {
  useNotificationStore,
  type NotificationCategory,
} from '@/stores/notifications';
import { useUpdatePreferences } from '@/queries/profile';
import { useToast } from '@/composables/useToast';
import type { Density, Locale, ThemeMode } from '@/types';

defineOptions({ layout: null });

const ui = useUiStore();
const notifications = useNotificationStore();
const updatePrefs = useUpdatePreferences();
const toast = useToast();

const themeOptions = [
  { value: 'light' as ThemeMode, label: 'Light', icon: Sun },
  { value: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
  { value: 'system' as ThemeMode, label: 'System', icon: Monitor },
];
const densityOptions = [
  { value: 'comfortable' as Density, label: 'Comfortable', icon: Rows3 },
  { value: 'compact' as Density, label: 'Compact', icon: Rows4 },
];
const localeOptions = [
  { value: 'en' as Locale, label: 'English' },
  { value: 'zh' as Locale, label: '中文' },
  { value: 'ar' as Locale, label: 'العربية' },
];

const theme = computed({
  get: () => ui.theme,
  set: (value: ThemeMode) => {
    ui.setTheme(value);
    // The server stores only concrete themes; 'system' is a local choice.
    if (value !== 'system') {
      updatePrefs.mutate({ theme: value });
    }
  },
});

const density = computed({
  get: () => ui.density,
  set: (value: Density) => ui.setDensity(value), // client-only
});

const locale = computed({
  get: () => ui.locale,
  set: (value: Locale) => {
    ui.locale = value;
    updatePrefs.mutate(
      { locale: value },
      { onSuccess: () => toast.success('Language updated') },
    );
  },
});

const categories: { key: NotificationCategory; label: string; hint: string }[] = [
  { key: 'mentions', label: 'Mentions & follow-ups', hint: 'When a teammate @mentions you or a call-back is due.' },
  { key: 'approvals', label: 'Approvals assigned to me', hint: 'KYC, deposits and account requests awaiting your action.' },
  { key: 'assignments', label: 'Lead assignments', hint: 'When a lead is assigned or reassigned to you.' },
  { key: 'system', label: 'System & team notices', hint: 'Announcements from administrators and supervisors.' },
];
</script>

<template>
  <SettingsLayout>
    <SettingsCard
      title="Appearance"
      description="Personalise the look and density of the console. Theme and language sync across your devices."
    >
      <SettingsRow title="Theme" description="Light, dark, or follow your system.">
        <SegmentedControl
          v-model="theme"
          :options="themeOptions"
          aria-label="Theme"
        />
      </SettingsRow>
      <SettingsRow
        title="Density"
        description="Compact fits more rows — Binance-console style. Stored on this device."
      >
        <SegmentedControl
          v-model="density"
          :options="densityOptions"
          aria-label="Density"
        />
      </SettingsRow>
      <SettingsRow title="Language" description="Arabic switches to a right-to-left layout.">
        <SegmentedControl
          v-model="locale"
          :options="localeOptions"
          aria-label="Language"
        />
      </SettingsRow>
    </SettingsCard>

    <SettingsCard
      title="Notifications"
      description="Choose how each category reaches you. Stored on this device."
    >
      <SettingsRow
        v-for="cat in categories"
        :key="cat.key"
        :title="cat.label"
        :description="cat.hint"
      >
        <div class="flex items-center gap-5">
          <label class="flex items-center gap-2 text-xs text-muted">
            <Switch
              :model-value="notifications.preferences[cat.key].toast"
              :aria-label="`${cat.label} toast`"
              @update:model-value="notifications.setPref(cat.key, 'toast', $event)"
            />
            Toast
          </label>
          <label class="flex items-center gap-2 text-xs text-muted">
            <Switch
              :model-value="notifications.preferences[cat.key].bell"
              :aria-label="`${cat.label} bell`"
              @update:model-value="notifications.setPref(cat.key, 'bell', $event)"
            />
            Bell
          </label>
        </div>
      </SettingsRow>
    </SettingsCard>
  </SettingsLayout>
</template>
