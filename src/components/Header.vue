<script setup>
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import arrowDownIcon from '@/assets/images/common/arrow_down.png';
import i18nCnIcon from '@/assets/images/common/i18n_cn.png';
import i18nEnIcon from '@/assets/images/common/i18n_en.png';
import logoUrl from '@/assets/images/common/logo.png';
import navbarHomeIcon from '@/assets/images/common/navbar_home.png';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();

const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const navbarList = [
  { labelKey: '首页', key: 'home' },
  { labelKey: '市场', key: 'market' },
  { labelKey: '交易账务', key: 'trade' },
  { labelKey: '会员服务', key: 'member' },
  { labelKey: '我的权益', key: 'myBenefit' },
];

const localeIcons = [
  { key: 'cn', src: i18nCnIcon, alt: '中文' },
  { key: 'en', src: i18nEnIcon, alt: 'English' },
];
</script>

<template>
  <div class="header">
    <div class="card-primary">
      <img class="logo" :src="logoUrl" alt="logo" />
      <div class="navbar" v-if="!isMobile">
        <div class="navbar-item" v-for="item in navbarList" :key="item.key">
          <img class="navbar-item-icon" :src="navbarHomeIcon" alt="icon" v-if="item.key === 'home'" />
          {{ t(item.labelKey) }}
          <img class="arrow-icon" :src="arrowDownIcon" alt="" v-if="item.key !== 'home'" />
        </div>
      </div>
      <div class="i18n-select">
        <img
          v-for="item in localeIcons"
          :key="item.key"
          class="i18n-icon"
          :src="item.src"
          :alt="item.alt"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  background: var(--theme-bg);
  z-index: 10;

  .card-primary {
    display: flex;
    align-items: center;
  }

  @include container;

  @include web-only {
    padding-top: 30px;
    height: $web-header-height;

    .card-primary {
      height: 80px;
      border-radius: 40px;
      padding: 0 40px;

      .logo {
        height: 36px;
        cursor: pointer;
      }

      .navbar {
        display: flex;
        align-items: center;
        margin-left: 20px;

        .navbar-item {
          display: flex;
          align-items: center;
          font-size: 17px;
          color: #171E24;
          min-width: 104px;
          justify-content: center;
          cursor: pointer;

          .navbar-item-icon {
            width: 18px;
            height: 18px;
            margin-right: 8px;
          }

          .arrow-icon {
            width: 10px;
            height: 6px;
            margin-left: 8px;
          }

          &.active {
            color: var(--theme-primary);
          }
        }
      }

      .i18n-select {
        margin-left: auto;
        height: 48px;
        background: #F0F7FF;
        border: 1px solid #D6E0EB;
        border-radius: 38px;
        padding: 4px;
        display: flex;
        gap: 4px;

        .i18n-icon {
          width: 40px;
          height: 40px;
          cursor: pointer;
        }
      }
    }
  }
}
</style>
