<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useAsset } from '@/hooks/useAsset';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const appStore = useAppStore();
const { currentSite, currentSkin, isMobile, siteOptions, siteKey } = storeToRefs(appStore);
const { getCommonImage, getTemplateImage } = useAsset();

const heroImage = computed(() => getTemplateImage('hero'));
const logoImage = computed(() => getCommonImage('logo'));

const featureCards = computed(() => [
  {
    title: t('home.features.stackTitle'),
    description: t('home.features.stackDesc'),
  },
  {
    title: t('home.features.multiSiteTitle'),
    description: t('home.features.multiSiteDesc'),
  },
  {
    title: t('home.features.responsiveTitle'),
    description: t('home.features.responsiveDesc'),
  },
  {
    title: t('home.features.stylesTitle'),
    description: t('home.features.stylesDesc'),
  },
  {
    title: t('home.features.themeTitle'),
    description: t('home.features.themeDesc'),
  },
]);

const architectureItems = [
  'src/views',
  'src/components',
  'src/router',
  'src/store',
  'src/i18n',
  'src/utils',
  'src/styles',
  'src/config',
  'src/hooks',
];
</script>

<template>
  <div class="page-shell home">
    <section class="hero section-card">
      <div class="hero__content">
        <span class="tag">{{ t('home.badge') }}</span>

        <div class="hero__headline">
          <img class="hero__logo" :src="logoImage" alt="MySport brand" />
          <h1 class="hero__title">{{ t('home.title', { siteName: currentSite.siteName }) }}</h1>
        </div>

        <p class="hero__description">
          {{ t('home.description') }}
        </p>

        <div class="hero__actions">
          <RouterLink class="btn btn--primary" to="/site-workbench">
            {{ t('home.primaryAction') }}
          </RouterLink>
          <a class="btn btn--ghost" :href="currentSite.apiBaseUrl" target="_blank" rel="noreferrer">
            {{ t('home.secondaryAction') }}
          </a>
        </div>

        <ul class="hero__meta">
          <li>
            <span>{{ t('home.metaTemplate') }}</span>
            <strong>{{ currentSite.templateKey }}</strong>
          </li>
          <li>
            <span>{{ t('home.metaSkin') }}</span>
            <strong>{{ currentSkin.label }}</strong>
          </li>
          <li>
            <span>{{ t('home.metaApi') }}</span>
            <strong>{{ currentSite.apiBaseUrl }}</strong>
          </li>
          <li>
            <span>{{ t('home.metaDevice') }}</span>
            <strong>{{ isMobile ? t('common.mobile') : t('common.desktop') }}</strong>
          </li>
        </ul>
      </div>

      <div class="hero__visual">
        <img :src="heroImage" :alt="currentSite.siteName" />
      </div>
    </section>

    <section class="home__section">
      <div class="home__section-heading">
        <h2 class="section-title">{{ t('home.featuresTitle') }}</h2>
      </div>
      <div class="feature-grid">
        <article
          v-for="item in featureCards"
          :key="item.title"
          class="feature-card section-card"
        >
          <h3 class="feature-card__title">{{ item.title }}</h3>
          <p class="feature-card__desc">{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section class="home__section">
      <div class="home__section-heading">
        <h2 class="section-title">{{ t('home.sitesTitle') }}</h2>
        <p class="section-desc">{{ currentSite.siteName }}</p>
      </div>
      <div class="site-grid">
        <article
          v-for="site in siteOptions"
          :key="site.key"
          class="site-card section-card"
          :style="{ '--site-accent': site.brandColor }"
        >
          <div class="site-card__header">
            <span class="site-card__chip">{{ t('common.template') }}</span>
            <span v-if="site.key === siteKey" class="site-card__current">
              {{ t('common.current') }}
            </span>
          </div>
          <h3 class="site-card__title">{{ site.label }}</h3>
          <p class="site-card__desc">{{ site.apiBaseUrl }}</p>
          <div class="site-card__footer">
            <span>{{ site.templateKey }}</span>
            <button type="button" class="btn btn--ghost" @click="appStore.setSiteKey(site.key)">
              {{ t('common.switchTo') }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="home__section section-card">
      <h2 class="section-title">{{ t('home.architectureTitle') }}</h2>
      <p class="section-desc">{{ t('home.architectureDescription') }}</p>
      <div class="architecture-list">
        <span
          v-for="item in architectureItems"
          :key="item"
          class="architecture-list__item"
        >
          {{ item }}
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tools.scss' as *;

.home {
  display: grid;
  gap: rem(22);
}

.hero {
  display: grid;
  gap: rem(24);
  overflow: hidden;

  @include respond-up(lg) {
    grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
    align-items: center;
  }
}

.hero__content {
  display: grid;
  gap: rem(18);
}

.hero__headline {
  display: grid;
  gap: rem(14);
}

.hero__logo {
  width: rem(64);
  height: rem(64);
}

.hero__title {
  font-family: $font-family-heading;
  font-size: rem(34);
  line-height: 1;
  letter-spacing: 0.05em;

  @include respond-up(md) {
    font-size: 48px;
  }
}

.hero__description {
  max-width: 64ch;
  font-size: rem(15);
  line-height: 1.8;
  color: var(--theme-text-secondary);

  @include respond-up(md) {
    font-size: 16px;
  }
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: rem(12);
}

.hero__meta {
  display: grid;
  gap: rem(12);

  @include respond-up(md) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include respond-up(xl) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.hero__meta li {
  padding: rem(14) rem(16);
  border-radius: rem(18);
  background: var(--theme-hero-panel);
  border: 1px solid var(--theme-border);
}

.hero__meta span {
  display: block;
  margin-bottom: rem(8);
  font-size: rem(12);
  color: var(--theme-text-secondary);
}

.hero__meta strong {
  display: block;
  font-size: rem(14);
  line-height: 1.5;
  word-break: break-word;
}

.hero__visual {
  position: relative;
  align-self: stretch;
  min-height: rem(280);
  padding: rem(8);
  border-radius: rem(28);
  background:
    linear-gradient(145deg, var(--theme-glow-primary), var(--theme-glow-accent)),
    var(--theme-hero-panel);
}

.hero__visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: rem(22);
}

.home__section {
  display: grid;
  gap: rem(18);
}

.home__section-heading {
  display: grid;
  gap: rem(8);
}

.feature-grid,
.site-grid {
  display: grid;
  gap: rem(16);
}

@media (min-width: 768px) {
  .feature-grid,
  .site-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.feature-card__title,
.site-card__title {
  font-size: rem(18);
  font-weight: 800;
}

.feature-card__desc,
.site-card__desc {
  margin-top: rem(10);
  font-size: rem(14);
  line-height: 1.7;
  color: var(--theme-text-secondary);
}

.site-card {
  border-top: 4px solid var(--site-accent, #0b6bcb);
}

.site-card__header,
.site-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: rem(12);
}

.site-card__chip,
.site-card__current {
  display: inline-flex;
  align-items: center;
  min-height: rem(28);
  padding: 0 rem(12);
  border-radius: 999px;
  font-size: rem(12);
  font-weight: 700;
}

.site-card__chip {
  color: #fff;
  background: var(--site-accent, #0b6bcb);
}

.site-card__current {
  color: var(--theme-primary-dark);
  background: var(--theme-primary-soft);
}

.site-card__footer {
  margin-top: rem(18);
}

.site-card__footer span {
  color: var(--theme-text-secondary);
}

.architecture-list {
  display: flex;
  flex-wrap: wrap;
  gap: rem(10);
  margin-top: rem(16);
}

.architecture-list__item {
  display: inline-flex;
  align-items: center;
  min-height: rem(36);
  padding: 0 rem(14);
  border-radius: 999px;
  font-size: rem(13);
  font-weight: 700;
  color: var(--theme-text);
  background: var(--theme-surface-strong);
  border: 1px solid var(--theme-border);
}
</style>
