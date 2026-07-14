<script setup>
import { useI18n } from 'vue-i18n';

import aboutTitleUrl from '@/assets/images/about-title.png';
import AppSideNav from '@/components/AppSideNav.vue';
import { getImageUrl } from '@/utils/common';

const { t, locale } = useI18n();
const sideNavItems = [{ key: 'about', label: t('关于我们') }];
const titleLeftIcon = getImageUrl('vip/title_left_icon.svg');
const titleRightIcon = getImageUrl('vip/title_right_icon.svg');
</script>

<template>
  <div class="about-page">
    <div class="about-page__layout">
      <AppSideNav :items="sideNavItems" active-key="about" />

      <main class="about-content">
        <h1 class="about-content__title">
          <img
            v-if="locale === 'zh-CN'"
            class="about-content__title-image"
            :src="aboutTitleUrl"
            :alt="t('关于我们')"
          />
          <template v-else>
            <img :src="titleLeftIcon" alt="" />
            <span>{{ t('关于我们') }}</span>
            <img :src="titleRightIcon" alt="" />
          </template>
        </h1>

        <div class="about-content__body">
          <p>{{ t('关于我们介绍一') }}</p>
          <p>{{ t('关于我们介绍二') }}</p>
          <p>{{ t('关于我们风险提示') }}</p>
        </div>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.about-page {
  color: var(--theme-text);

  @include web-only {
    min-height: calc(100dvh - 140px);
    margin: -18px -8px 0;
  }

  @include mobile-only {
    min-height: calc(100dvh - 136px);
  }
}

.about-page__layout {
  @include web-only {
    display: flex;
    gap: 20px;
    width: min(1000px, calc(100vw - 80px));
    margin: 10px auto 60px;
  }
}

.about-content {
  box-sizing: border-box;
  background: #fff;
  box-shadow: var(--shadow-card);

  @include web-only {
    flex: 1;
    min-width: 0;
    min-height: min(690px, calc(100dvh - 132px));
    padding: 42px 40px;
    border-radius: 25px;
  }

  @include mobile-only {
    min-height: calc(100dvh - 152px);
    margin: 0 8px 16px;
    padding: 28px 18px;
    border-radius: 16px;
  }
}

.about-content__title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 0;
  color: var(--theme-primary);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;

  img {
    width: 17px;
    height: 5px;
    object-fit: contain;
  }

  .about-content__title-image {
    width: 144px;
    height: 29px;
  }

  @include mobile-only {
    gap: 10px;
    font-size: 18px;

    .about-content__title-image {
      width: 132px;
      height: auto;
    }
  }
}

.about-content__body {
  margin-top: 26px;

  p {
    margin: 0;
    font-size: 15px;
    line-height: 2;
    text-align: left;

    + p {
      margin-top: 18px;
    }
  }

  @include mobile-only {
    margin-top: 22px;

    p {
      font-size: 14px;
      line-height: 1.85;

      + p {
        margin-top: 16px;
      }
    }
  }
}
</style>
