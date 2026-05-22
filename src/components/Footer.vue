<script setup>
import { useI18n } from 'vue-i18n';

import logoUrl from '@/assets/images/common/logo.png';
import { SITE_CONFIG } from '@/config/site';

const { t } = useI18n();

const footerLinks = [
  { label: '关于我们', key: 'about', to: '/' },
  { label: '联系我们', key: 'contact', to: '/' },
  { label: '帮助中心', key: 'help', to: '/' },
  { label: '服务条款', key: 'terms', to: '/' },
  { label: '隐私政策', key: 'privacy', to: '/' },
];
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__logo">
        <img :src="logoUrl" alt="logo" class="footer__logo-img" />
      </div>
      <div class="footer__links">
        <RouterLink
          v-for="link in footerLinks"
          :key="link.key"
          :to="link.to"
          class="footer__link"
        >
          {{ t(link.label) }}
        </RouterLink>
      </div>
      <div class="footer__copyright">
        © {{ new Date().getFullYear() }} {{ SITE_CONFIG.siteName }}. {{ t('版权所有') }}
      </div>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.footer {
  background: #000;
  color: rgba(255, 255, 255, 0.6);
  padding: 40px 0;

  &__inner {
    @include container;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;

    @include web-only {
      max-width: $web-content-max;
      margin: 0 auto;
    }
  }

  &__logo-img {
    height: 28px;
    opacity: 0.6;
    filter: brightness(10);
  }

  &__links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 24px;

    @include mobile-only {
      gap: 16px;
    }
  }

  &__link {
    font-size: $font-size-md;
    color: rgba(255, 255, 255, 0.6);
    transition: color 0.2s;

    &:hover {
      color: #fff;
    }
  }

  &__copyright {
    font-size: $font-size-sm;
    opacity: 0.4;
  }
}
</style>
