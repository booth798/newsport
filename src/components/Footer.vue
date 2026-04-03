<script setup>
import { useI18n } from 'vue-i18n';
import { useAsset } from '@/hooks/useAsset';

const { t } = useI18n();
const { getTemplateImage } = useAsset();

const footerLinks = [
  { label: '关于我们', key: 'about' },
  { label: '联系我们', key: 'contact' },
  { label: '帮助中心', key: 'help' },
  { label: '服务条款', key: 'terms' },
  { label: '隐私政策', key: 'privacy' },
];
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__logo">
        <img :src="getTemplateImage('logo')" alt="logo" class="footer__logo-img" />
      </div>
      <div class="footer__links">
        <a
          v-for="link in footerLinks"
          :key="link.key"
          class="footer__link"
          href="javascript:;"
        >
          {{ t(link.label) }}
        </a>
      </div>
      <div class="footer__copyright">
        © {{ new Date().getFullYear() }} MySport. {{ t('版权所有') }}
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
