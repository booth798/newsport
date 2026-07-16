<script setup>
/**
 * H5 底部主导航。
 * 账务 / 我的需登录：未登录时拦截跳转，先弹「请先登录」确认框。
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
    key: 'finance',
    to: '/finance',
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

const isActive = (tab) => tab.match(route);
const iconSrc = (tab) => (isActive(tab) ? tab.iconActive : tab.icon);

function handleTabClick(event, tab, navigate) {
  if (tab.requiresAuth && !isLoggedIn.value) {
    event.preventDefault();
    appStore.openLoginConfirm();
    return;
  }
  navigate(event);
}
</script>

<template>
  <nav class="mobile-tab-bar" aria-label="主导航">
    <template v-for="tab in tabs" :key="tab.key">
      <RouterLink v-if="tab.to" v-slot="{ navigate, href }" :to="tab.to" custom>
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
  z-index: 200;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  gap: 2px;
  padding: 8px 4px calc(8px + env(safe-area-inset-bottom, 0px));
  border-top: 2px solid #fff;
  background: var(--theme-bg);
  border-radius: $radius-lg $radius-lg 0 0;
  // 避免向上 box-shadow 在部分 WebKit 里顶边出现一条亮线（易被看成白边）
  transform: translateZ(0);
  backface-visibility: hidden;
}

.mobile-tab-bar__item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 2px 4px;
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
}

.mobile-tab-bar__icon {
  display: block;
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.mobile-tab-bar__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  font-weight: 500;
}
</style>
