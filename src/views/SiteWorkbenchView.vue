<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { APP_SETTINGS } from '@/config/app';
import { useAsset } from '@/hooks/useAsset';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const appStore = useAppStore();
const { currentSite, currentSkin, previewEnabled, siteOptions, skinOptions } = storeToRefs(appStore);
const { getCommonImage, getTemplateImage } = useAsset();

const configItems = computed(() => [
  { label: t('workbench.fields.siteName'), value: currentSite.value.siteName },
  { label: t('workbench.fields.siteKey'), value: currentSite.value.key },
  { label: t('workbench.fields.templateKey'), value: currentSite.value.templateKey },
  { label: t('workbench.fields.apiBaseUrl'), value: currentSite.value.apiBaseUrl },
  { label: t('workbench.fields.brandColor'), value: currentSite.value.brandColor },
  { label: t('workbench.fields.skinKey'), value: currentSkin.value.key },
  { label: t('workbench.fields.skinLabel'), value: currentSkin.value.label },
  { label: t('workbench.fields.themeColor'), value: currentSkin.value.themeColor },
  { label: t('workbench.fields.colorScheme'), value: currentSkin.value.colorScheme },
]);

const envItems = computed(() => [
  { label: 'defaultSiteKey', value: APP_SETTINGS.defaultSiteKey },
  { label: 'defaultLocale', value: APP_SETTINGS.defaultLocale },
  { label: 'fallbackLocale', value: APP_SETTINGS.fallbackLocale },
  { label: 'requestTimeout', value: String(APP_SETTINGS.requestTimeout) },
  { label: 'sitePreviewEnabled', value: String(APP_SETTINGS.sitePreviewEnabled) },
]);

const assetItems = computed(() => [
  {
    label: `${t('common.commonImage')} / logo`,
    src: getCommonImage('logo'),
  },
  {
    label: `${t('common.commonImage')} / poster`,
    src: getCommonImage('poster'),
  },
  {
    label: `${t('common.templateImage')} / hero`,
    src: getTemplateImage('hero'),
  },
]);

const tokenItems = computed(() => [
  { label: 'theme-primary', value: currentSkin.value.tokens['theme-primary'] },
  { label: 'theme-primary-dark', value: currentSkin.value.tokens['theme-primary-dark'] },
  { label: 'theme-accent', value: currentSkin.value.tokens['theme-accent'] },
  { label: 'theme-text', value: currentSkin.value.tokens['theme-text'] },
  { label: 'theme-text-secondary', value: currentSkin.value.tokens['theme-text-secondary'] },
  { label: 'theme-surface', value: currentSkin.value.tokens['theme-surface'] },
  { label: 'theme-bg-start', value: currentSkin.value.tokens['theme-bg-start'] },
  { label: 'theme-bg-end', value: currentSkin.value.tokens['theme-bg-end'] },
]);

const hookSnippet = `import { useAsset } from '@/hooks/useAsset';
import { useTheme } from '@/hooks/useTheme';

const { currentSkin } = useTheme();
const { getCommonImage, getTemplateImage, getImage } = useAsset();

// 皮肤切换后，CSS 变量会跟着 currentSkin 更新
// 站点切换后，图片资源会跟着当前站点更新
const logo = getCommonImage('logo');
const hero = getTemplateImage('hero');
const poster = getImage('poster', { scope: 'common' });
const customHero = getImage('hero', {
  scope: 'template',
  customSiteKey: 'arena',
});`;

const requestSnippet = `import { request } from '@/utils/request';

const data = await request('/matches/list', {
  method: 'GET',
});
`;
</script>

<template>
  <div class="page-shell workbench">
    <section class="section-card">
      <h1 class="section-title">{{ t('workbench.title') }}</h1>
      <p class="section-desc">{{ t('workbench.description') }}</p>
    </section>

    <section class="info-grid">
      <article class="section-card">
        <h2 class="section-title workbench__title">{{ t('workbench.currentConfig') }}</h2>
        <div class="info-list">
          <div
            v-for="item in configItems"
            :key="item.label"
            class="info-item"
          >
            <span class="info-label">{{ item.label }}</span>
            <strong class="info-value">{{ item.value }}</strong>
          </div>
        </div>
      </article>

      <article class="section-card">
        <h2 class="section-title workbench__title">{{ t('workbench.envTitle') }}</h2>
        <div class="info-list">
          <div
            v-for="item in envItems"
            :key="item.label"
            class="info-item"
          >
            <span class="info-label">{{ item.label }}</span>
            <strong class="info-value">{{ item.value }}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="info-grid">
      <article class="section-card">
        <h2 class="section-title workbench__title">{{ t('workbench.assetsTitle') }}</h2>
        <div class="asset-grid">
          <figure
            v-for="item in assetItems"
            :key="item.label"
            class="asset-card"
          >
            <img :src="item.src" :alt="item.label" />
            <figcaption>{{ item.label }}</figcaption>
          </figure>
        </div>
      </article>

      <article class="section-card">
        <h2 class="section-title workbench__title">{{ t('workbench.switchLabel') }}</h2>
        <div class="preset-list">
          <button
            v-for="site in siteOptions"
            :key="site.key"
            type="button"
            class="preset-card"
            :class="{ 'is-active': currentSite.key === site.key }"
            :disabled="!previewEnabled"
            @click="appStore.setSiteKey(site.key)"
          >
            <span class="preset-card__name">{{ site.label }}</span>
            <span class="preset-card__meta">{{ site.apiBaseUrl }}</span>
          </button>
        </div>
      </article>
    </section>

    <section class="info-grid">
      <article class="section-card">
        <h2 class="section-title workbench__title">{{ t('workbench.skinSwitchLabel') }}</h2>
        <div class="preset-list">
          <button
            v-for="skin in skinOptions"
            :key="skin.key"
            type="button"
            class="preset-card"
            :class="{ 'is-active': currentSkin.key === skin.key }"
            :disabled="!previewEnabled"
            @click="appStore.setSkinKey(skin.key)"
          >
            <span class="preset-card__name">{{ skin.label }}</span>
            <span class="preset-card__meta">
              {{ skin.colorScheme }} · {{ skin.themeColor }}
            </span>
          </button>
        </div>
      </article>

      <article class="section-card">
        <h2 class="section-title workbench__title">{{ t('workbench.themeTokenTitle') }}</h2>
        <div class="token-grid">
          <div
            v-for="item in tokenItems"
            :key="item.label"
            class="token-card"
          >
            <span class="token-card__swatch" :style="{ background: item.value }"></span>
            <div class="token-card__content">
              <span class="token-card__name">{{ item.label }}</span>
              <span class="token-card__value">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="info-grid">
      <article class="section-card">
        <h2 class="section-title workbench__title">{{ t('workbench.hookTitle') }}</h2>
        <pre class="code-block">{{ hookSnippet }}</pre>
      </article>

      <article class="section-card">
        <h2 class="section-title workbench__title">{{ t('workbench.requestTitle') }}</h2>
        <pre class="code-block">{{ requestSnippet }}</pre>
      </article>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tools.scss' as *;

.workbench {
  display: grid;
  gap: rem(22);
}

.workbench__title {
  margin-bottom: rem(18);
  font-size: rem(20);

  @include respond-up(md) {
    font-size: 24px;
  }
}

.asset-grid,
.preset-list {
  display: grid;
  gap: rem(16);
}

.asset-card {
  overflow: hidden;
  border-radius: rem(18);
  background: var(--theme-surface-strong);
  border: 1px solid var(--theme-border);
}

.asset-card img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.asset-card figcaption {
  padding: rem(14);
  font-size: rem(13);
  color: var(--theme-text-secondary);
}

.preset-card {
  display: grid;
  gap: rem(8);
  padding: rem(18);
  text-align: left;
  border-radius: rem(18);
  background: var(--theme-surface-strong);
  border: 1px solid var(--theme-border);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.preset-card:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.preset-card:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: var(--theme-card-shadow);
}

.preset-card.is-active {
  border-color: var(--theme-primary-soft);
  box-shadow: var(--theme-primary-shadow);
}

.preset-card__name {
  font-size: rem(16);
  font-weight: 800;
}

.preset-card__meta {
  font-size: rem(13);
  color: var(--theme-text-secondary);
  word-break: break-all;
}

.token-grid {
  display: grid;
  gap: rem(14);
}

.token-card {
  display: grid;
  grid-template-columns: rem(28) minmax(0, 1fr);
  gap: rem(12);
  align-items: center;
  padding: rem(14);
  border-radius: rem(16);
  background: var(--theme-surface-strong);
  border: 1px solid var(--theme-border);
}

.token-card__swatch {
  width: rem(28);
  height: rem(28);
  border-radius: 50%;
  border: 1px solid var(--theme-border);
}

.token-card__content {
  display: grid;
  gap: rem(4);
}

.token-card__name {
  font-size: rem(13);
  font-weight: 700;
}

.token-card__value {
  font-size: rem(12);
  color: var(--theme-text-secondary);
  word-break: break-all;
}

@media (min-width: 768px) {
  .asset-grid,
  .preset-list,
  .token-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
