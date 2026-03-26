<script setup>
import { storeToRefs } from 'pinia';

import { useAppStore } from '@/store/modules/app';

const appStore = useAppStore();
const { locale } = storeToRefs(appStore);

const languages = [
  { label: '中文', value: 'zh-CN' },
  { label: 'EN', value: 'en-US' },
];
</script>

<template>
  <div class="language-switcher">
    <button
      v-for="item in languages"
      :key="item.value"
      type="button"
      class="language-switcher__button"
      :class="{ 'is-active': locale === item.value }"
      @click="appStore.setLocale(item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tools.scss' as *;

.language-switcher {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  background: var(--theme-surface);
  border: 1px solid var(--theme-border);
}

.language-switcher__button {
  min-width: rem(64);
  min-height: rem(36);
  padding: 0 rem(14);
  border-radius: 999px;
  font-size: rem(13);
  font-weight: 700;
  color: var(--theme-text-secondary);
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.language-switcher__button.is-active {
  color: #fff;
  background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-dark) 100%);
  box-shadow: var(--theme-primary-shadow);
}
</style>
