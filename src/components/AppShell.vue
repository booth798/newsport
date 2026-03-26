<script setup>
import { computed } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';
import { useAsset } from '@/hooks/useAsset';
import { useAppStore } from '@/store/modules/app';

const appStore = useAppStore();
const { currentSite, currentSkin, previewEnabled, siteKey, siteOptions, isMobile } = storeToRefs(appStore);
const { t } = useI18n();
const { getCommonImage } = useAsset();

const selectedSite = computed({
  get: () => siteKey.value,
  set: (value) => appStore.setSiteKey(value),
});

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

        <nav class="app-shell__nav">
          <RouterLink class="app-shell__nav-link" to="/">
            {{ t('nav.home') }}
          </RouterLink>
          <RouterLink class="app-shell__nav-link" to="/site-workbench">
            {{ t('nav.siteWorkbench') }}
          </RouterLink>
        </nav>

        <div class="app-shell__actions">
          <label v-if="previewEnabled" class="site-switcher">
            <span class="site-switcher__label">{{ t('common.site') }}</span>
            <select v-model="selectedSite" class="site-switcher__select">
              <option
                v-for="site in siteOptions"
                :key="site.key"
                :value="site.key"
              >
                {{ site.label }}
              </option>
            </select>
          </label>

          <ThemeSwitcher v-if="previewEnabled" />

          <span class="skin-tag">{{ currentSkin.label }}</span>

          <span class="device-tag">{{ isMobile ? t('common.mobile') : t('common.desktop') }}</span>

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
    grid-template-columns: auto 1fr auto;
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

.app-shell__nav {
  display: flex;
  flex-wrap: wrap;
  gap: rem(10);
}

.app-shell__nav-link {
  display: inline-flex;
  align-items: center;
  min-height: rem(40);
  padding: 0 rem(16);
  border-radius: 999px;
  font-weight: 700;
  color: var(--theme-text-secondary);
  background: var(--theme-surface-strong);
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.app-shell__nav-link.router-link-active {
  color: #fff;
  background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-dark) 100%);
}

.app-shell__actions {
  display: flex;
  flex-wrap: wrap;
  gap: rem(12);
  align-items: center;
}

.site-switcher {
  display: inline-flex;
  gap: rem(8);
  align-items: center;
  min-height: rem(42);
  padding: 0 rem(12);
  border-radius: 999px;
  background: var(--theme-surface);
  border: 1px solid var(--theme-border);
}

.site-switcher__label {
  font-size: rem(12);
  font-weight: 700;
  color: var(--theme-text-secondary);
}

.site-switcher__select {
  min-width: rem(120);
  border: 0;
  background: transparent;
  color: var(--theme-text);
  outline: none;
}

.skin-tag,
.device-tag {
  display: inline-flex;
  align-items: center;
  min-height: rem(40);
  padding: 0 rem(14);
  border-radius: 999px;
  font-size: rem(12);
  font-weight: 800;
}

.skin-tag {
  color: var(--theme-primary-dark);
  background: var(--theme-primary-soft);
}

.device-tag {
  color: var(--theme-accent);
  background: var(--theme-accent-soft);
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
