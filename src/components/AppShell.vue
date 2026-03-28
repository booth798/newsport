<script setup>
import { RouterLink, RouterView } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { useAsset } from '@/hooks/useAsset';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const { currentSite } = storeToRefs(useAppStore());
const { getCommonImage } = useAsset();
const currentYear = new Date().getFullYear();
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <div class="page-shell app-shell__header-inner">
        <RouterLink class="brand" to="/">
          <img class="brand__logo" :src="getCommonImage('logo')" alt="MySport logo" />
          <div>
            <p class="brand__title">{{ currentSite.siteName }}</p>
            <p class="brand__subtitle">{{ t('app.subtitle') }}</p>
          </div>
        </RouterLink>

        <div class="app-shell__actions">
          <LanguageSwitcher />
        </div>
      </div>
    </header>

    <main class="app-shell__main">
      <RouterView />
    </main>

    <footer class="app-shell__footer">
      <div class="page-shell app-shell__footer-inner">
        <p>{{ currentSite.siteName }} · {{ t('app.footer') }}</p>
        <p>{{ currentYear }}</p>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tools.scss' as *;

.app-shell {
  min-height: 100vh;
}

.app-shell__header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: rem(16) 0 rem(8);
  backdrop-filter: blur(18px);
}

.app-shell__header-inner {
  display: grid;
  gap: rem(16);
  align-items: center;
  padding-top: rem(14);
  padding-bottom: rem(14);
  border-radius: rem(24);
  background: var(--theme-surface-strong);
  border: 1px solid var(--theme-border);
  box-shadow: var(--theme-header-shadow);

  @include respond-up(lg) {
    grid-template-columns: auto 1fr;
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: rem(12);
}

.brand__logo {
  width: rem(48);
  height: rem(48);
}

.brand__title {
  font-family: $font-family-heading;
  font-size: rem(18);
  letter-spacing: 0.05em;
}

.brand__subtitle {
  margin-top: rem(4);
  font-size: rem(12);
  color: var(--theme-text-secondary);
}

.app-shell__actions {
  display: flex;
  justify-content: flex-end;
}

.app-shell__main {
  padding: rem(8) 0 rem(28);

  @include respond-up(md) {
    padding-bottom: 40px;
  }
}

.app-shell__footer {
  padding: 0 0 rem(24);
}

.app-shell__footer-inner {
  display: flex;
  flex-wrap: wrap;
  gap: rem(10);
  justify-content: space-between;
  padding-top: rem(18);
  color: var(--theme-text-secondary);
  font-size: rem(13);
}
</style>
