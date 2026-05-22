<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="not-found">
    <div class="not-found__inner">
      <span class="not-found__code">404</span>
      <h1 class="not-found__title">{{ t('页面未找到') }}</h1>
      <p class="not-found__desc">{{ t('您访问的页面不存在或已被移除') }}</p>
      <RouterLink to="/" class="btn btn--primary not-found__btn">
        {{ t('返回首页') }}
      </RouterLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.not-found {
  @include container;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;

  &__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }

  &__code {
    font-family: $font-family-num;
    font-size: 96px;
    font-weight: 800;
    line-height: 1;
    color: var(--theme-primary);
    opacity: 0.15;

    @include mobile-only {
      font-size: 72px;
    }
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 700;
    color: var(--theme-text);
    margin: 0;
  }

  &__desc {
    font-size: $font-size-base;
    color: var(--theme-text-1);
    margin: 0 0 12px;
  }

  &__btn {
    min-width: 160px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
