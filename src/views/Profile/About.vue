<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import logoAboutUrl from '@/assets/images/common/logo_about.png?url';
import iconNavBackMarketUrl from '@/assets/images/common/icon_back_white.png?url';
import AppSideNav from '@/components/AppSideNav.vue';
import { getImageUrl } from '@/utils/common';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile, brandName } = storeToRefs(appStore);

const sideNavItems = [{ key: 'about', label: t('关于我们') }];
const titleLeftIcon = getImageUrl('vip/title_left_icon.png');
const titleRightIcon = getImageUrl('vip/title_right_icon.png');
// H5 版本号展示与设计稿一致。
const appVersion = 'V1.0.0';

function goBack() {
  router.back();
}
</script>

<template>
  <div class="about-page">
    <!-- H5：设计稿顶部胶囊导航 -->
    <header v-if="isMobile" class="about-page__header">
      <div class="about-page__nav-bar">
        <button type="button" class="about-page__back" :aria-label="t('返回')" @click="goBack">
          <img :src="iconNavBackMarketUrl" width="36" height="36" alt="" />
        </button>
        <h1 class="about-page__nav-title">{{ t('关于我们') }}</h1>
      </div>
    </header>

    <div class="about-page__layout">
      <AppSideNav v-if="!isMobile" :items="sideNavItems" active-key="about" />

      <main class="about-content">
        <h1 v-if="!isMobile" class="about-content__title">
          <img :src="titleLeftIcon" alt="" />
          <span>{{ t('关于我们') }}</span>
          <img :src="titleRightIcon" alt="" />
        </h1>

        <!-- H5：品牌 Logo + 名称 + 版本号 -->
        <div v-if="isMobile" class="about-brand">
          <!-- 关于我们品牌图：直接使用完整 logo 资源 -->
          <img class="about-brand__logo" :src="logoAboutUrl" alt="" width="64" height="64" />
          <p class="about-brand__name">{{ brandName }}</p>
          <p class="about-brand__version">{{ appVersion }}</p>
        </div>

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
    min-height: 100dvh;
    margin: -18px -8px 0;
    padding: 0 8px 20px;
    box-sizing: border-box;
    background: var(--surface-card);
  }
}

.about-page__header {
  @include mobile-only {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 8px 0;
  }
}

.about-page__nav-bar {
  position: relative;
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 12px;
  border: 0.8px solid #fff;
  border-radius: 30px;
  background: var(--theme-primary);
  box-sizing: border-box;
}

.about-page__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;

  img {
    display: block;
    width: 36px;
    height: 36px;
  }

  &:active {
    opacity: 0.7;
  }
}

.about-page__nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--auxiliary-1);
  white-space: nowrap;
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
    min-height: calc(100dvh - 88px);
    margin: 0;
    padding: 28px 18px 32px;
    border-radius: 16px;
    box-shadow: none;
  }
}

.about-content__title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 0;
  color: var(--theme-text);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;

  img {
    width: 17px;
    height: 5px;
    object-fit: contain;
  }

}

.about-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.about-brand__logo {
  display: block;
  width: 90px;
  height: 90px;
  border-radius: 16px;
  object-fit: contain;
  /* Logo 外轮廓：浅边框 + 柔和投影，贴近 App 图标质感 */
  border: 1px solid rgba(var(--theme-text-rgb), 0.08);
  box-shadow:
    0 2px 8px rgba(var(--theme-text-rgb), 0.12),
    0 8px 20px rgba(var(--theme-text-rgb), 0.08);
}

.about-brand__name {
  margin: 12px 0 0;
  color: var(--theme-text);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.about-brand__version {
  margin: 6px 0 0;
  color: rgba(var(--theme-text-rgb), 0.45);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
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
    margin-top: 0;

    p {
      color: var(--theme-text);
      font-size: 14px;
      font-weight: 400;
      line-height: 1.85;

      + p {
        margin-top: 16px;
      }
    }
  }
}
</style>
