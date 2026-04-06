<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAsset } from '@/hooks/useAsset';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/store/modules/app';
import { storeToRefs } from 'pinia';
import LoginModal from '@/components/LoginModal.vue';

const { t } = useI18n();
const route = useRoute();
const { getTemplateImage } = useAsset();
const appStore = useAppStore();
const { isMobile, locale } = storeToRefs(appStore);
const showLogin = ref(false);

const navbarList = [
  { label: '首页', key: 'home', to: '/' },
  { label: '市场', key: 'market', to: '/market' },
  { label: '交易账务', key: 'finance', to: '/finance' },
  { label: '会员服务', key: 'member', to: '/member' },
  { label: '我的权益', key: 'profile', to: '/profile' },
];

const isActive = (item) => {
  if (item.to === '/') return route.path === '/';
  return route.path.startsWith(item.to);
};

const toggleLocale = () => {
  appStore.setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN');
};
</script>

<template>
  <div class="header">
    <div class="card-primary">
      <RouterLink to="/" class="logo-link">
        <img class="logo" :src="getTemplateImage('logo')" alt="logo" />
      </RouterLink>
      <div class="navbar" v-if="!isMobile">
        <RouterLink
          v-for="item in navbarList"
          :key="item.key"
          :to="item.to"
          class="navbar-item"
          :class="{ active: isActive(item) }"
        >
          <svg v-if="item.key === 'home'" class="navbar-item-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.25 9.75L9 3L15.75 9.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4.5 7.5V14.25C4.5 14.6642 4.83579 15 5.25 15H7.5V11.25H10.5V15H12.75C13.1642 15 13.5 14.6642 13.5 14.25V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ t(item.label) }}
          <svg v-if="item.key !== 'home'" class="arrow-icon" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </RouterLink>
      </div>
      <div class="header-right">
        <div class="i18n-select" @click="toggleLocale">
          <span
            class="i18n-btn"
            :class="{ active: locale === 'zh-CN' }"
          >中</span>
          <span
            class="i18n-btn"
            :class="{ active: locale === 'en-US' }"
          >EN</span>
        </div>
        <button class="btn btn--primary login-btn" @click="showLogin = true">
          {{ t('登录') }}
        </button>
      </div>
    </div>

    <LoginModal :visible="showLogin" @close="showLogin = false" />
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
    margin-bottom: 10px;

    .card-primary {
      height: 80px;
      border-radius: 40px;
      padding: 0 40px;
    }

    .logo-link {
      display: flex;
      align-items: center;
    }

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
        color: var(--text-nav);
        min-width: 104px;
        justify-content: center;
        cursor: pointer;
        text-decoration: none;
        transition: color 0.2s;

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

        &:hover {
          color: var(--theme-primary);
        }
      }
    }

    .header-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .i18n-select {
      height: 48px;
      background: var(--surface-tint);
      border: 1px solid var(--border-light);
      border-radius: 38px;
      padding: 4px;
      display: flex;
      gap: 4px;
      cursor: pointer;

      .i18n-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text);
        transition: all 0.2s;

        &.active {
          background: var(--theme-primary);
          color: #fff;
        }
      }
    }

    .login-btn {
      height: 44px;
      padding: 0 28px;
      font-size: 16px;
    }
  }

  @include mobile-only {
    padding: 8px 0;

    .card-primary {
      height: 48px;
      border-radius: 30px;
      padding: 0 16px;
    }

    .logo-link {
      display: flex;
      align-items: center;
    }

    .logo {
      height: 24px;
    }

    .header-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .i18n-select {
      height: 36px;
      background: var(--surface-tint);
      border: 1px solid var(--border-light);
      border-radius: 28px;
      padding: 3px;
      display: flex;
      gap: 3px;
      cursor: pointer;

      .i18n-btn {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        color: var(--theme-text);

        &.active {
          background: var(--theme-primary);
          color: #fff;
        }
      }
    }

    .login-btn {
      height: 32px;
      padding: 0 16px;
      font-size: $font-size-sm;
    }
  }
}
</style>
