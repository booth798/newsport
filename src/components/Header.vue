<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';

import arrowDownIcon from '@/assets/images/common/arrow_down.svg';
import arrowDownPrimaryIcon from '@/assets/images/common/arrow_down_primary.svg';
import i18nCnIcon from '@/assets/images/common/i18n_cn.svg';
import i18nCnUnselected from '@/assets/images/common/i18n_cn_unselected.svg';
import i18nEnIcon from '@/assets/images/common/i18n_en.svg';
import i18nEnUnselected from '@/assets/images/common/i18n_en_unselected.svg';
import logoUrl from '@/assets/images/common/logo_nav.svg';
import navbarHomeIcon from '@/assets/images/common/navbar_home.svg';
import navbarHomeMutedIcon from '@/assets/images/common/navbar_home_muted.svg';
import loginIconUrl from '@/assets/images/common/icon_login.svg?url';
import moreIconUrl from '@/assets/images/common/icon_more.svg?url';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();

const appStore = useAppStore();
const route = useRoute();
const { isMobile, locale } = storeToRefs(appStore);

const cnIconSrc = computed(() =>
  locale.value === 'zh-CN' ? i18nCnIcon : i18nCnUnselected,
);
const enIconSrc = computed(() =>
  locale.value === 'en-US' ? i18nEnIcon : i18nEnUnselected,
);

const navbarList = [
  { labelKey: '首页', key: 'home', width: 104 },
  { labelKey: '市场', key: 'market', width: 104 },
  { labelKey: '交易账务', key: 'trade', width: 124 },
  { labelKey: '会员服务', key: 'member', width: 124 },
  { labelKey: '我的权益', key: 'myBenefit', width: 124 },
];

const navTo = (item) => {
  const paths = {
    home: '/',
    market: '/market',
    trade: '/finance/deposit',
    member: '/profile',
    myBenefit: '/profile',
  };
  return paths[item.key] ?? '/';
};

const isNavActive = (item) => {
  if (item.key === 'home') return route.name === 'home';
  if (item.key === 'market') {
    return route.name === 'market' || route.name === 'market-detail';
  }
  if (item.key === 'trade') return route.path.startsWith('/finance');
  if (item.key === 'member') return route.path.startsWith('/profile');
  if (item.key === 'myBenefit') return false;
  return false;
};
</script>

<template>
  <div class="header">
    <div class="card-primary norem">
      <img class="logo" :src="logoUrl" alt="logo" />
      <div class="navbar" v-if="!isMobile">
        <RouterLink
          v-for="item in navbarList"
          :key="item.key"
          :to="navTo(item)"
          custom
          v-slot="{ navigate, href }"
        >
          <a
            :href="href"
            class="navbar-item"
            :class="{ active: isNavActive(item) }"
            :style="{ width: `${item.width}px` }"
            @click="navigate"
          >
            <img
              v-if="item.key === 'home'"
              class="navbar-item-icon"
              :src="isNavActive(item) ? navbarHomeIcon : navbarHomeMutedIcon"
              alt=""
            />
            <span class="navbar-item__label">{{ t(item.labelKey) }}</span>
            <img
              v-if="item.key !== 'home'"
              class="arrow-icon"
              :src="isNavActive(item) ? arrowDownPrimaryIcon : arrowDownIcon"
              alt=""
            />
          </a>
        </RouterLink>
      </div>
      <div v-if="isMobile" class="header-mobile-actions">
        <button type="button" class="header-mobile-btn" :aria-label="t('登录')">
          <img class="header-mobile-btn__img" :src="loginIconUrl" alt="" />
        </button>
        <button type="button" class="header-mobile-btn" :aria-label="t('菜单')">
          <img class="header-mobile-btn__img" :src="moreIconUrl" alt="" />
        </button>
      </div>
      <div v-else class="header-toolbar">
        <div class="i18n-select">
          <button
            type="button"
            class="i18n-select__btn"
            :aria-pressed="locale === 'zh-CN'"
            @click="appStore.setLocale('zh-CN')"
          >
            <img class="i18n-icon" :src="cnIconSrc" alt="中文" />
          </button>
          <button
            type="button"
            class="i18n-select__btn"
            :aria-pressed="locale === 'en-US'"
            @click="appStore.setLocale('en-US')"
          >
            <img class="i18n-icon" :src="enIconSrc" alt="English" />
          </button>
        </div>
        <a href="#" class="header-forgot" @click.prevent>{{ t('忘记密码') }}</a>
        <div class="header-round-group">
          <button type="button" class="header-round-btn" :aria-label="t('登录')">
            <img class="header-round-btn__img" :src="loginIconUrl" alt="" />
          </button>
          <button type="button" class="header-round-btn" :aria-label="t('菜单')">
            <img class="header-round-btn__img" :src="moreIconUrl" alt="" />
          </button>
        </div>
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
    width: 100%;
    box-sizing: border-box;
  }

  @include container;

  @include mobile-only {
    padding-top: 12px;
    padding-bottom: 0;

    .card-primary.norem {
      height: 57px;
      min-height: 57px;
      padding: 0 12px;
      border-radius: 30px;
      background: var(--surface-card);
      border: 0.8px solid var(--auxiliary-1);
      justify-content: space-between;
      gap: 12px;
    }

    .logo {
      display: block;
      width: 78px;
      height: 28px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .header-mobile-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      margin-left: auto;
    }

    .header-mobile-btn {
      flex-shrink: 0;
      border: none;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: transparent;
      border-radius: 50%;

      &__img {
        width: 36px;
        height: 36px;
        display: block;
        pointer-events: none;
      }
    }
  }

  @include web-only {
    padding-top: 30px;
    height: $web-header-height;

    .card-primary.norem {
      height: 80px;
      border-radius: 40px;
      padding: 0 44px;

      .logo {
        width: 100px;
        height: 36px;
        cursor: pointer;
        flex-shrink: 0;
        object-fit: contain;
      }

      .navbar {
        display: flex;
        align-items: center;
        margin-left: 20px;

        .navbar-item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: 0;
          min-height: 24px;
          font-size: 17px;
          font-weight: 400;
          line-height: 1;
          color: #171e24;
          opacity: 0.5;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
          gap: 8px;

          &__label {
            display: inline-block;
            line-height: 1;
          }

          .navbar-item-icon {
            width: 18px;
            height: 18px;
            flex-shrink: 0;
            display: block;
            line-height: 0;
          }

          .arrow-icon {
            width: 10px;
            height: 6px;
            flex-shrink: 0;
            display: block;
            line-height: 0;
            /* 与中文 17px 混排时，箭头视觉中心略偏上，略下移对齐 */
            transform: translateY(2px);
          }

          &.active {
            opacity: 1;
            font-weight: 500;
            color: var(--theme-primary);
          }
        }
      }

      .header-toolbar {
        margin-left: auto;
        display: flex;
        align-items: center;
        flex-shrink: 0;
        gap: 0;
      }

      .i18n-select {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        gap: 4px;
        width: 92px;
        height: 48px;
        padding: 4px;
        box-sizing: border-box;
        background: var(--surface-tint);
        border: 1px solid var(--border-light);
        border-radius: 38px;

        &__btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 50%;
        }

        .i18n-icon {
          width: 40px;
          height: 40px;
          display: block;
          pointer-events: none;
        }
      }

      .header-forgot {
        margin-left: 18px;
        margin-right: 18px;
        font-size: 16px;
        font-weight: 400;
        line-height: 1;
        color: rgba(23, 30, 36, 0.5);
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;

        &:hover {
          color: var(--theme-primary);
        }
      }

      .header-round-group {
        display: flex;
        align-items: center;
        gap: 18px;
        flex-shrink: 0;
      }

      .header-round-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        flex-shrink: 0;

        &__img {
          width: 48px;
          height: 48px;
          display: block;
          pointer-events: none;
        }
      }
    }
  }
}
</style>
