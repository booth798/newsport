<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const appStore = useAppStore();
const { skinKey, skinOptions } = storeToRefs(appStore);

const selectedSkin = computed({
  get: () => skinKey.value,
  set: (value) => appStore.setSkinKey(value),
});
</script>

<template>
  <label class="theme-switcher">
    <span class="theme-switcher__label">{{ t('common.skin') }}</span>
    <select v-model="selectedSkin" class="theme-switcher__select">
      <option
        v-for="skin in skinOptions"
        :key="skin.key"
        :value="skin.key"
      >
        {{ skin.label }}
      </option>
    </select>
  </label>
</template>

<style scoped lang="scss">
@use '@/styles/tools.scss' as *;

.theme-switcher {
  display: inline-flex;
  gap: rem(8);
  align-items: center;
  min-height: rem(42);
  padding: 0 rem(12);
  border-radius: 999px;
  background: var(--theme-surface);
  border: 1px solid var(--theme-border);
}

.theme-switcher__label {
  font-size: rem(12);
  font-weight: 700;
  color: var(--theme-text-secondary);
}

.theme-switcher__select {
  min-width: rem(126);
  border: 0;
  background: transparent;
  color: var(--theme-text);
  outline: none;
}
</style>

