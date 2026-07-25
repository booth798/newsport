<script setup>
/**
 * H5 底部主导航（对齐 Figma：首页 / 市场 / 客服 / 账务 / 我的）。
 * 中间「客服」为凸起圆形入口，点击走在线客服确认弹窗（不跳 Tab 路由）。
 * 账务 / 我的 / 市场需登录：未登录时拦截跳转，先弹「请先登录」确认框。
 */
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import tabFinance from '@/assets/images/tabs/tab_finance@3x.png';
import tabFinanceActive from '@/assets/images/tabs/tab_finance_active@3x.png';
import tabHome from '@/assets/images/tabs/tab_home@3x.png';
import tabHomeActive from '@/assets/images/tabs/tab_home_active@3x.png';
import tabMarket from '@/assets/images/tabs/tab_market@3x.png';
import tabMarketActive from '@/assets/images/tabs/tab_market_active@3x.png';
import tabProfile from '@/assets/images/tabs/tab_profile@3x.png';
import tabProfileActive from '@/assets/images/tabs/tab_profile_active@3x.png';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';

const { t } = useI18n();
const route = useRoute();
const appStore = useAppStore();
const userStore = useUserStore();
const { isLoggedIn } = storeToRefs(userStore);

const tabs = [
  {
    key: 'home',
    to: '/',
    labelKey: '首页',
    icon: tabHome,
    iconActive: tabHomeActive,
    requiresAuth: false,
    match: (r) => r.name === 'home',
  },
  {
    key: 'market',
    to: '/market',
    labelKey: '市场',
    icon: tabMarket,
    iconActive: tabMarketActive,
    requiresAuth: true,
    match: (r) => r.name === 'market' || r.name === 'market-league' || r.name === 'market-detail',
  },
  {
    key: 'service',
    // 中间客服：非路由 Tab，点击打开客服确认
    action: 'service',
    labelKey: '客服',
    requiresAuth: false,
  },
  {
    key: 'finance',
    to: '/finance/records',
    labelKey: '账务',
    icon: tabFinance,
    iconActive: tabFinanceActive,
    requiresAuth: true,
    match: (r) => r.path.startsWith('/finance'),
  },
  {
    key: 'profile',
    to: '/profile',
    labelKey: '我的',
    icon: tabProfile,
    iconActive: tabProfileActive,
    requiresAuth: true,
    match: (r) => r.path.startsWith('/profile'),
  },
];

const isActive = (tab) => (tab.match ? tab.match(route) : false);
const iconSrc = (tab) => (isActive(tab) ? tab.iconActive : tab.icon);

function handleTabClick(event, tab, navigate) {
  if (tab.requiresAuth && !isLoggedIn.value) {
    event.preventDefault();
    appStore.openLoginConfirm();
    return;
  }
  navigate(event);
}

function openService() {
  appStore.openCustomerServiceConfirm();
}
</script>

<template>
  <nav class="mobile-tab-bar" aria-label="主导航">
    <template v-for="tab in tabs" :key="tab.key">
      <!-- 中间客服：凸起圆形入口 -->
      <button
        v-if="tab.action === 'service'"
        type="button"
        class="mobile-tab-bar__item mobile-tab-bar__item--service"
        :aria-label="t(tab.labelKey)"
        @click="openService"
      >
        <!-- 内联 SVG：避免外部 svg+filter 在部分 WebView 不渲染 -->
        <span class="mobile-tab-bar__service-fab" aria-hidden="true">
          <svg
            class="mobile-tab-bar__service-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
          >
            <rect x="4" y="2" width="40" height="40" rx="20" fill="url(#tabBarServiceGrad)" />
            <rect x="4.75" y="2.75" width="38.5" height="38.5" rx="19.25" stroke="#fff" stroke-width="1.5" />
            <path
              fill="#fff"
              d="M25.0636 11.5525C29.9069 12.0302 33.8508 15.8961 34.4236 20.7298C34.7722 23.6743 33.8898 26.4019 32.2396 28.4932L32.8344 31.5621C32.8977 31.8863 32.5857 32.1568 32.2737 32.0496L29.3292 31.0356C27.4109 32.169 25.1099 32.7248 22.6553 32.4152C17.8314 31.8058 13.9948 27.8424 13.5463 23.0015C12.9345 16.3934 18.4506 10.9017 25.0636 11.5525ZM17.6901 24.3641C17.6901 24.6566 17.9265 24.893 18.219 24.893H20.1812C20.4737 24.893 20.7101 24.6566 20.7101 24.3641V21.5098C20.7101 21.2441 20.5127 21.0344 20.2592 20.9954C20.5883 19.3891 22.0142 18.1752 23.7156 18.1752C25.4194 18.1752 26.8429 19.3867 27.172 20.9954C26.9185 21.0344 26.7211 21.2441 26.7211 21.5098V24.3641C26.7211 24.6566 26.9575 24.893 27.25 24.893H27.5815C27.5084 26.0655 26.626 27.0112 25.4804 27.1794C25.4194 27.0234 25.2683 26.9113 25.0879 26.9113H23.4621C23.2281 26.9113 23.038 27.1014 23.038 27.3354V28.2202C23.038 28.4542 23.2281 28.6444 23.4621 28.6444H25.0952C25.2902 28.6444 25.4462 28.5103 25.4974 28.3299C27.2646 28.1496 28.6516 26.6895 28.7271 24.8955H29.2195C29.512 24.8955 29.7485 24.659 29.7485 24.3665V21.5098C29.7485 21.2173 29.512 20.9808 29.2195 20.9808H29.1732C28.8149 18.2849 26.509 16.196 23.718 16.196C20.9271 16.196 18.6212 18.2825 18.2629 20.9784H18.2166C17.9241 20.9784 17.6876 21.2148 17.6876 21.5073V24.3641H17.6901Z"
            />
            <defs>
              <linearGradient id="tabBarServiceGrad" x1="24" y1="2" x2="24" y2="42" gradientUnits="userSpaceOnUse">
                <stop stop-color="#93C0FF" />
                <stop offset="1" stop-color="#2E83FB" />
              </linearGradient>
            </defs>
          </svg>
        </span>
        <span class="mobile-tab-bar__label">{{ t(tab.labelKey) }}</span>
      </button>

      <RouterLink v-else-if="tab.to" v-slot="{ navigate, href }" :to="tab.to" custom>
        <a
          :href="href"
          class="mobile-tab-bar__item"
          :class="{ 'mobile-tab-bar__item--active': isActive(tab) }"
          @click="handleTabClick($event, tab, navigate)"
        >
          <img class="mobile-tab-bar__icon" :src="iconSrc(tab)" alt="" width="28" height="28" />
          <span class="mobile-tab-bar__label">{{ t(tab.labelKey) }}</span>
        </a>
      </RouterLink>
    </template>
  </nav>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.mobile-tab-bar {
  position: fixed;
  /* 高于版本更新浮层，保证「我的」等 Tab 始终可点 */
  z-index: 210;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 2px;
  // 内容区正常排布；背景用 ::before 单独压矮，客服大圆自然露出
  padding: 0 4px calc(6px + env(safe-area-inset-bottom, 0px));
  background: transparent;
  border: none;
  overflow: visible;

  // 底栏背景：高度略矮于整行内容，圆钮上半部分自然凸出
  &::before {
    content: '';
    position: absolute;
    z-index: 0;
    left: 0;
    right: 0;
    bottom: 0;
    // 底栏背景：略矮于整行，客服大圆仍可自然露出上沿
    height: calc(60px + env(safe-area-inset-bottom, 0px));
    background: var(--theme-bg);
    border-top: 2px solid #fff;
    border-radius: $radius-lg $radius-lg 0 0;
    pointer-events: none;
  }
}

.mobile-tab-bar__item {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 0 4px 2px;
  border: none;
  background: transparent;
  text-decoration: none;
  color: var(--theme-text-1);
  font-size: $font-size-xs;
  line-height: 1.2;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;

  &--active {
    color: var(--theme-primary);
  }

  &--service {
    color: var(--theme-primary);
  }
}

.mobile-tab-bar__icon {
  display: block;
  width: 28px;
  height: 28px;
  object-fit: contain;
}

// 客服圆钮：正常文档流，不单独上移；靠背景变矮形成凸出
.mobile-tab-bar__service-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  filter: drop-shadow(0 2px 4px rgba(167, 184, 204, 0.9));
}

.mobile-tab-bar__service-icon {
  display: block;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.mobile-tab-bar__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  font-weight: 500;
}
</style>
