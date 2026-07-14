<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import navCollapsedIcon from '@/assets/images/common/icon_nav_collapsed.svg';
import navExpandedIcon from '@/assets/images/common/icon_nav_expanded.svg';
import logoUrl from '@/assets/images/common/logo_nav.svg';
import navbarHomeIcon from '@/assets/images/common/navbar_home.svg';
import navbarHomeMutedIcon from '@/assets/images/common/navbar_home_muted.svg';
import loginIconUrl from '@/assets/images/common/icon_login.svg?url';
import serviceIconUrl from '@/assets/images/common/icon_header_service.svg?url';
import moreIconUrl from '@/assets/images/common/icon_more.svg?url';
import avatarDefaultUrl from '@/assets/images/common/avatar_default.png?url';
import iconNavBackMarketUrl from '@/assets/images/common/icon_nav_back_market.svg?url';
import MobileNavDrawer from '@/components/MobileNavDrawer.vue';
import MessageCenterModal from '@/components/MessageCenterModal.vue';
import MonthSelector from '@/components/MonthSelector.vue';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { fetchUnreadCount } from '@/api/user';


import iconMarketList from '@/assets/images/menu/icon_market_list.svg';
import iconMy from '@/assets/images/menu/icon_my.svg';
import iconPersonalProfile from '@/assets/images/menu/icon_personal_profile.svg';
import iconPurchaseDetails from '@/assets/images/menu/icon_purchase_details.svg';
import iconSettings from '@/assets/images/menu/icon_settings.svg';
import iconTransactionRecords from '@/assets/images/menu/icon_transaction_records.svg';

const { t } = useI18n();

const appStore = useAppStore();
const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const { isMobile } = storeToRefs(appStore);
const { isLoggedIn, loggedInUserId, loggedInAssetsFormatted } = storeToRefs(userStore);

const hoverOpenKey = ref(null);
const mobileDrawerOpen = ref(false);
const messageCenterOpen = ref(false);
const unreadCount = ref(0);
let unreadTimer = null;

async function loadUnreadCount() {
  if (!isLoggedIn.value) { unreadCount.value = 0; return; }
  try {
    const res = await fetchUnreadCount();
    unreadCount.value = Number(res.data) || 0;
  } catch { unreadCount.value = 0; }
}

function startUnreadPolling() {
  stopUnreadPolling();
  if (!isLoggedIn.value) return;
  unreadTimer = setInterval(loadUnreadCount, 30_000);
}

function stopUnreadPolling() {
  if (unreadTimer) { clearInterval(unreadTimer); unreadTimer = null; }
}

const navMenus = {
  market: [
    { labelKey: '市场列表', to: '/market', icon: iconMarketList },
  ],
  trade: [
    { labelKey: '买入明细', to: '/trade/purchases', icon: iconPurchaseDetails },
    { labelKey: '交易记录', to: '/finance/records', icon: iconTransactionRecords },
  ],
  myBenefit: [
    { labelKey: '我的', to: '/profile', icon: iconMy },
    { labelKey: '个人资料', to: '/profile/info', icon: iconPersonalProfile },
    { labelKey: '设置', to: '/profile/security', icon: iconSettings },
  ],
};

const navbarList = [
  { kind: 'plain', labelKey: '首页', key: 'home', width: 104, to: '/' },
  { kind: 'dropdown', labelKey: '市场', key: 'market', width: 104, to: '/market', menuKey: 'market' },
  { kind: 'dropdown', labelKey: '交易账务', key: 'trade', width: 124, to: '/finance/deposit', menuKey: 'trade' },
  { kind: 'dropdown', labelKey: '会员权益', key: 'myBenefit', width: 124, to: '/profile', menuKey: 'myBenefit' },
  { kind: 'plain', labelKey: '关于我们', key: 'about', width: 124, to: '/profile/about' },
];

const isNavActive = (item) => {
  if (item.key === 'home') return route.name === 'home';
  if (item.key === 'market') {
    return (
      route.name === 'market' ||
      route.name === 'market-league' ||
      route.name === 'market-detail'
    );
  }
  if (item.key === 'trade') return route.path.startsWith('/finance') || route.name === 'trade-purchases';
  if (item.key === 'myBenefit') return route.path.startsWith('/profile') && route.name !== 'profile-about';
  if (item.key === 'about') return route.name === 'profile-about';
  return false;
};

const isNavEntryActive = (item) => hoverOpenKey.value === item.key || isNavActive(item);

const navArrowSrc = (item) => (hoverOpenKey.value === item.key ? navExpandedIcon : navCollapsedIcon);

const isSubmenuLinkActive = (sub) => {
  const to = sub.to;
  if (typeof to === 'object' && to != null && 'path' in to) {
    const hash = to.hash ?? '';
    return route.path === to.path && (route.hash || '') === hash;
  }
  if (to === '/market') {
    return (
      route.name === 'market' ||
      route.name === 'market-league' ||
      route.name === 'market-detail'
    );
  }
  if (to === '/trade/purchases') return route.name === 'trade-purchases';
  if (to === '/finance/deposit') return route.name === 'finance-deposit';
  if (to === '/finance/records') return route.name === 'finance-records';
  if (to === '/profile') return route.name === 'profile' || route.name === 'profile-home';
  if (to === '/profile/info') return route.name === 'profile-info';
  if (to === '/profile/security') return route.name === 'profile-security';
  if (to === '/') return false;
  return false;
};

/** 市场列表 / 比分市场详情：顶栏改为「返回 + 右侧账户区」，与首页主导航区分 */
const isMarketListPage = computed(() => route.name === 'market');
const isMarketLeaguePage = computed(() => route.name === 'market-league');
const isMarketDetailPage = computed(() => route.name === 'market-detail');
const isPurchaseDetailsPage = computed(() => route.name === 'trade-purchases');
const isProfileHomePage = computed(() => route.name === 'profile' || route.name === 'profile-home');
const isProfileSubPage = computed(
  () => route.path.startsWith('/profile') && !isProfileHomePage.value,
);
const isFinancePage = computed(() => route.path.startsWith('/finance'));
const isVipTransferPage = computed(() => route.name === 'finance-vip-transfer');
const vipTransferMonth = computed({
  get() {
    const month = Array.isArray(route.query.month) ? route.query.month[0] : route.query.month;
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') ? month : getShanghaiCurrentMonth();
  },
  set(month) {
    // 月份写入路由查询参数，让 Header 与互转记录共用同一筛选状态。
    router.replace({ query: { ...route.query, month } });
  },
});
const isFinanceCompact = computed(() => isFinancePage.value && !isMobile.value);
const isCompactDetailHeader = computed(
  () =>
    isMarketLeaguePage.value ||
    isMarketDetailPage.value ||
    isPurchaseDetailsPage.value ||
    (isMobile.value && route.meta?.compactHeader) ||
    (isMobile.value && isProfileSubPage.value) ||
    isFinanceCompact.value
);
const compactTitle = computed(() => t(route.meta?.titleKey || '返回'));
const isMobileMarketListHeader = computed(() => isMobile.value && isMarketListPage.value);
const isMobileProfileHomeHeader = computed(() => isMobile.value && isProfileHomePage.value);
const compactHeaderBackTo = computed(() => {
  if (isVipTransferPage.value) {
    return '/profile';
  }
  if (isPurchaseDetailsPage.value) {
    const raw = route.query.marketId;
    const id = Number(Array.isArray(raw) ? raw[0] : raw);
    if (Number.isFinite(id) && id > 0) {
      return { name: 'market-detail', params: { id: String(id) } };
    }
    return '/market';
  }
  if (isMarketLeaguePage.value) {
    return '/market';
  }
  if (isProfileSubPage.value) {
    return '/profile';
  }
  if (isProfileHomePage.value) {
    return '/';
  }
  if (route.meta?.compactHeader) {
    return '/';
  }
  if (isMarketDetailPage.value) {
    const raw = route.query.fromLeague;
    const league = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    if (league) {
      return { name: 'market-league', params: { league } };
    }
    return '/market';
  }
  return '/';
});

function getShanghaiCurrentMonth() {
  // 使用上海时区确定自然月，避免用户设备时区导致月份边界偏差。
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}`;
}

const beijingNowStr = ref('');
let beijingTimer = null;

function updateBeijingClock() {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const pick = (type) => parts.find((p) => p.type === type)?.value ?? '';
  beijingNowStr.value = `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

function clearBeijingTimer() {
  if (beijingTimer != null && typeof window !== 'undefined') {
    window.clearInterval(beijingTimer);
    beijingTimer = null;
  }
}

function startBeijingTimerIfNeeded() {
  clearBeijingTimer();
  if (
    typeof window === 'undefined' ||
    (route.name !== 'market' &&
      route.name !== 'market-league' &&
      route.name !== 'market-detail' &&
      route.name !== 'trade-purchases')
  ) {
    return;
  }
  updateBeijingClock();
  beijingTimer = window.setInterval(updateBeijingClock, 1000);
}

function openMarketSearch() {
  router.push({ name: 'market-search' });
}

watch(
  () => route.name,
  () => {
    startBeijingTimerIfNeeded();
    appStore.closeCustomerServiceConfirm();
  },
  { immediate: true },
);

onMounted(() => {
  loadUnreadCount();
});

onUnmounted(() => {
  clearBeijingTimer();
});

watch(messageCenterOpen, (open) => {
  if (!open) loadUnreadCount();
});

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) loadUnreadCount();
  else unreadCount.value = 0;
});
</script>

<template>
  <div class="header" :class="{ 'header--market-detail': isCompactDetailHeader }">

    <div class="card-primary norem" :class="{ 'card-primary--market-detail': isCompactDetailHeader }">
      <RouterLink
        v-if="isMobile && isCompactDetailHeader"
        :to="compactHeaderBackTo"
        class="header-market-back-btn header-market-back-btn--m"
        :aria-label="t('返回')"
      >
        <img class="header-market-back-btn__img" :src="iconNavBackMarketUrl" width="40" height="40" alt="" />
      </RouterLink>
      <span v-if="isMobile && isCompactDetailHeader" class="header-mobile-compact-title">{{ compactTitle }}</span>
      <img v-if="isMobile && !isCompactDetailHeader" class="logo" :src="logoUrl" alt="logo" />

      <RouterLink
        v-if="!isMobile && isCompactDetailHeader"
        :to="compactHeaderBackTo"
        custom
        v-slot="{ navigate, href }"
      >
        <a
          :href="href"
          class="header-market-back-btn"
          :aria-label="t('返回')"
          @click="navigate"
        >
          <img class="header-market-back-btn__img" :src="iconNavBackMarketUrl" width="48" height="48" alt="" />
        </a>
      </RouterLink>
      <img v-else-if="!isMobile" class="logo" :src="logoUrl" alt="logo" />

      <div class="navbar" v-if="!isMobile && !isCompactDetailHeader">
        <template v-for="item in navbarList" :key="item.key">
          <RouterLink
            v-if="item.kind === 'plain'"
            :to="item.to"
            custom
            v-slot="{ navigate, href }"
          >
            <a
              :href="href"
              class="navbar-item"
              :class="{
                active: isNavActive(item),
                'navbar-item--plain': item.key === 'home',
              }"
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
            </a>
          </RouterLink>

          <div
            v-else
            class="navbar-item-wrap"
            :style="{ width: `${item.width}px` }"
            @mouseenter="hoverOpenKey = item.key"
            @mouseleave="hoverOpenKey = null"
          >
            <RouterLink :to="item.to" custom v-slot="{ navigate, href }">
              <a
                :href="href"
                class="navbar-item"
                :class="{ active: isNavEntryActive(item) }"
                @click="navigate"
              >
                <span class="navbar-item__label">{{ t(item.labelKey) }}</span>
                <img class="arrow-icon" :src="navArrowSrc(item)" alt="" />
              </a>
            </RouterLink>
            <div v-show="hoverOpenKey === item.key" class="navbar-dropdown-shell">
              <div class="navbar-dropdown" role="menu">
                <RouterLink
                  v-for="sub in navMenus[item.menuKey]"
                  :key="sub.labelKey"
                  :to="sub.to"
                  custom
                  v-slot="{ navigate, href }"
                >
                  <a
                    :href="href"
                    class="navbar-dropdown__row"
                    :class="{ 'is-active': isSubmenuLinkActive(sub) }"
                    role="menuitem"
                    @click="navigate"
                  >
                    <img class="navbar-dropdown__icon" :src="sub.icon" alt="" />
                    <span class="navbar-dropdown__label">{{ t(sub.labelKey) }}</span>
                  </a>
                </RouterLink>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div v-if="isMobile && !isProfileSubPage" class="header-mobile-actions">
        <template v-if="isCompactDetailHeader">
          <template v-if="isVipTransferPage">
            <MonthSelector v-model="vipTransferMonth" :aria-label="t('选择月份')" />
          </template>
          <template v-else-if="isLoggedIn">
            <button type="button" class="header-mobile-btn" :aria-label="t('在线客服')" @click="appStore.openCustomerServiceConfirm">
              <img class="header-mobile-btn__service-img" :src="serviceIconUrl" alt="" />
            </button>
            <button type="button" class="header-mobile-btn" :aria-label="t('菜单')" @click="mobileDrawerOpen = true">
              <img class="header-mobile-btn__img" :src="moreIconUrl" alt="" />
            </button>
          </template>
          <template v-else>
            <button type="button" class="header-mobile-login-btn" @click="appStore.openLoginModal()">
              {{ t('登录') }}
            </button>
          </template>
        </template>
        <template v-else-if="isMobileMarketListHeader">
          <button type="button" class="header-mobile-search" :aria-label="t('搜索')" @click="openMarketSearch">
            <span aria-hidden="true"></span>
          </button>
        </template>
        <template v-else-if="isMobileProfileHomeHeader">
          <button type="button" class="header-mobile-circle-btn" :aria-label="t('消息中心')" @click="messageCenterOpen = true">
            <span class="header-mobile-circle-btn__msg" aria-hidden="true"></span>
            <span v-if="unreadCount > 0" class="header-mobile-circle-btn__badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </button>
          <RouterLink to="/profile/security" class="header-mobile-circle-btn" :aria-label="t('安全设置')">
            <span class="header-mobile-circle-btn__gear" aria-hidden="true"></span>
          </RouterLink>
        </template>
     
        <template v-else-if="isLoggedIn">
          <button type="button" class="header-mobile-btn" :aria-label="t('在线客服')" @click="appStore.openCustomerServiceConfirm">
            <img class="header-mobile-btn__service-img" :src="serviceIconUrl" alt="" />
          </button>
          <button type="button" class="header-mobile-btn" :aria-label="t('菜单')" @click="mobileDrawerOpen = true">
            <img class="header-mobile-btn__img" :src="moreIconUrl" alt="" />
          </button>
        </template>
       
        <template v-else>
          <button type="button" class="header-mobile-login-btn" @click="appStore.openLoginModal()">
            {{ t('登录') }}
          </button>
        </template>
      </div>
      <div
        v-if="!isMobile"
        class="header-toolbar"
        :class="{
          'header-toolbar--member': isLoggedIn && !isCompactDetailHeader,
          'header-toolbar--market-detail': isCompactDetailHeader,
        }"
      >
        <template v-if="isCompactDetailHeader && isLoggedIn">
          <div class="header-market-detail-stack">
            <div class="header-market-belt-row">
              <div class="header-user-strip" role="group" :aria-label="loggedInUserId">
                <img
                  class="header-user-strip__avatar"
                  :src="avatarDefaultUrl"
                  width="40"
                  height="40"
                  alt=""
                />
                <span class="header-user-strip__id">{{ loggedInUserId }}</span>
                <div class="header-user-strip__assets">
                  <span class="header-user-strip__assets-label">{{ t('总资产') }}</span>
                  <span class="header-user-strip__assets-value">{{ loggedInAssetsFormatted }}</span>
                </div>
              </div>
              <button type="button" class="header-round-btn" :aria-label="t('在线客服')" @click="appStore.openCustomerServiceConfirm">
                <img class="header-round-btn__img" :src="serviceIconUrl" alt="" />
              </button>
              <button type="button" class="header-round-btn" :aria-label="t('菜单')">
                <img class="header-round-btn__img" :src="moreIconUrl" alt="" />
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="isCompactDetailHeader && !isLoggedIn">
          <div class="header-market-detail-stack">
            <div class="header-market-belt-row">
              <div class="header-round-group">
                <button type="button" class="header-round-btn" :aria-label="t('登录')" @click="appStore.openLoginModal">
                  <img class="header-round-btn__img" :src="loginIconUrl" alt="" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="isLoggedIn">
          <div class="header-user-strip" role="group" :aria-label="loggedInUserId">
            <img
              class="header-user-strip__avatar"
              :src="avatarDefaultUrl"
              width="40"
              height="40"
              alt=""
            />
            <span class="header-user-strip__id">{{ loggedInUserId }}</span>
            <div class="header-user-strip__assets">
              <span class="header-user-strip__assets-label">{{ t('总资产') }}</span>
              <span class="header-user-strip__assets-value">{{ loggedInAssetsFormatted }}</span>
            </div>
          </div>
          <button type="button" class="header-round-btn" :aria-label="t('在线客服')" @click="appStore.openCustomerServiceConfirm">
            <img class="header-round-btn__img" :src="serviceIconUrl" alt="" />
          </button>
          <button type="button" class="header-round-btn" :aria-label="t('菜单')">
            <img class="header-round-btn__img" :src="moreIconUrl" alt="" />
          </button>
        </template>

        <template v-else>
          <div class="header-round-group">
            <button type="button" class="header-round-btn" :aria-label="t('登录')" @click="appStore.openLoginModal">
              <img class="header-round-btn__img" :src="loginIconUrl" alt="" />
            </button>
          </div>
        </template>
      </div>
    </div>
    <MobileNavDrawer v-if="isMobile" v-model="mobileDrawerOpen" :menus="navMenus" />
    <MessageCenterModal v-model="messageCenterOpen" />
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
  @include web-main-column-max;

  @include mobile-only {
    padding-inline: 8px;
    padding-top: calc(env(safe-area-inset-top, 20px) + 4px);
    padding-bottom: 8px;

    .card-primary.norem {
      height: 52px;
      min-height: 52px;
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

    .header-mobile-user-strip {
      display: flex;
      align-items: center;
      flex: 1 1 auto;
      min-width: 0;
      height: 40px;
      margin: 0 8px;
      padding: 4px 8px 4px 4px;
      gap: 6px;
      box-sizing: border-box;
      background: #fff;
      border: 1px solid var(--border-light);
      border-radius: 999px;
      box-shadow: 0 1px 8px rgba(13, 108, 251, 0.1);

      .header-user-strip__avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }

      .header-user-strip__id {
        flex-shrink: 0;
        font-size: 13px;
        font-weight: 500;
        color: rgba(11, 52, 98, 0.58);
        line-height: 1.2;
        max-width: 72px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .header-user-strip__assets {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 1;
        min-width: 0;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(228, 240, 254, 0.98);
        border: 0.8px solid rgba(13, 108, 251, 0.14);
      }

      .header-user-strip__assets-label {
        font-size: 11px;
        font-weight: 500;
        color: rgba(11, 52, 98, 0.48);
        white-space: nowrap;
      }

      .header-user-strip__assets-value {
        font-family: $font-family-num, $font-family-base;
        font-size: 12px;
        font-weight: 700;
        color: #0d6cfb;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .header-mobile-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      margin-left: auto;
    }

    .header-mobile-compact-title {
      position: absolute;
      left: 64px;
      right: 64px;
      top: 50%;
      transform: translateY(-50%);
      color: #0b3462;
      font-size: 14px;
      font-weight: 700;
      line-height: 1;
      text-align: center;
      pointer-events: none;
    }

    .header-mobile-avatar {
      flex-shrink: 0;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border-radius: 50%;
      border: 1px solid var(--border-light);
      background: var(--auxiliary-1);
      text-decoration: none;
      overflow: hidden;
      cursor: pointer;

      &:focus-visible {
        outline: 2px solid var(--theme-primary);
        outline-offset: 2px;
      }

      &__img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
        pointer-events: none;
      }
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

      &:focus-visible {
        outline: 2px solid var(--theme-primary);
        outline-offset: 2px;
      }

      &__img {
        width: 36px;
        height: 36px;
        display: block;
        pointer-events: none;
        border-radius: 50%;
      }

      &__service-img {
        width: 36px;
        height: 36px;
        display: block;
        object-fit: contain;
        pointer-events: none;
        border-radius: 50%;
      }
    }

    .header-mobile-login-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 36px;
      padding: 0 20px;
      border: none;
      border-radius: 18px;
      background: linear-gradient(180deg, #3ba0ff 0%, #0d6cfb 100%);
      box-shadow: 0 4px 8px rgba(21, 58, 119, 0.12);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .header-mobile-search {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: linear-gradient(180deg, #1f7cff 0%, #0d6cfb 100%);
      box-shadow: 0 4px 8px rgba(21, 58, 119, 0.12);
      cursor: pointer;

      span {
        width: 22px;
        height: 22px;
        background: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22' fill='none'%3E%3Ccircle cx='9.5' cy='9.5' r='6.5' stroke='white' stroke-width='2'/%3E%3Cpath d='M14.5 14.5L20 20' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
      }
    }

    .header-mobile-circle-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 50%;
      background: linear-gradient(180deg, #3ba0ff 0%, #0d6cfb 100%);
      box-shadow: 0 4px 8px rgba(21, 58, 119, 0.12);
      cursor: pointer;
      text-decoration: none;

      span:not(.header-mobile-circle-btn__badge) {
        position: relative;
        width: 20px;
        height: 20px;
        background: transparent;
      }
    }

    .header-mobile-circle-btn__msg {
      border: 2px solid #fff;
      border-radius: 5px;

      &::before {
        content: '';
        position: absolute;
        left: 4px;
        bottom: -5px;
        width: 7px;
        height: 7px;
        border-left: 2px solid #fff;
        border-bottom: 2px solid #fff;
        background: #1b7cff;
        transform: rotate(-28deg);
      }

      &::after {
        content: '';
        position: absolute;
        left: 4px;
        right: 4px;
        top: 6px;
        height: 2px;
        border-radius: 2px;
        background: #fff;
        box-shadow: 0 5px 0 #fff;
      }
    }

    .header-mobile-circle-btn__badge {
      position: absolute;
      top: -4px;
      right: -6px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: #e74c3c;
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      line-height: 16px;
      text-align: center;
      pointer-events: none;
      z-index: 1;
    }

    .header-mobile-circle-btn__gear {
      border: 2px solid #fff;
      border-radius: 50%;

      &::before {
        content: '';
        position: absolute;
        inset: 5px;
        border: 2px solid #fff;
        border-radius: 50%;
      }

      &::after {
        content: '';
        position: absolute;
        left: 50%;
        top: -4px;
        width: 4px;
        height: 28px;
        border-radius: 3px;
        background:
          linear-gradient(#fff, #fff) top / 100% 5px no-repeat,
          linear-gradient(#fff, #fff) bottom / 100% 5px no-repeat;
        transform: translateX(-50%) rotate(45deg);
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
      overflow: visible;

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
        position: relative;
        z-index: 2;
        overflow: visible;

        .navbar-item-wrap {
          position: relative;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }

        .navbar-dropdown-shell {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          /* 透明热区：衔接主按钮与面板，避免经过缝隙时触发 mouseleave 关掉菜单 */
          padding-top: 10px;
          z-index: 20;
        }

        .navbar-dropdown {
          position: relative;
          left: auto;
          top: auto;
          transform: none;
          min-width: 220px;
          padding: 6px;
          box-sizing: border-box;
          background: var(--auxiliary-1);
          border-radius: 16px;
          border: 0.8px solid var(--border-light);
          box-shadow: var(--shadow-card);
        }

        .navbar-dropdown__row {
          display: flex;
          align-items: center;
          gap: 10px;
          box-sizing: border-box;
          min-height: 40px;
          height: 40px;
          padding: 0 12px;
          border-radius: 12px;
          text-decoration: none;
          color: #171e24;
          font-size: 15px;
          font-weight: 400;
          line-height: 1;
          cursor: pointer;
          transition:
            background-color 0.15s ease,
            color 0.15s ease;

          &:hover {
            background: var(--surface-tint);
            color: var(--theme-primary);
          }

          &.is-active {
            background: rgba(230, 240, 255, 0.85);
            color: var(--theme-primary);
            font-weight: 500;
          }

          &:focus-visible {
            outline: 2px solid var(--theme-primary);
            outline-offset: 0;
            border-radius: 12px;
          }
        }

        .navbar-dropdown__icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          display: block;
          object-fit: contain;
        }

        .navbar-dropdown__label {
          flex: 1;
          min-width: 0;
        }

        .navbar-item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          width: 100%;
          min-height: 48px;
          height: 48px;
          padding: 0 12px;
          border: 1px solid transparent;
          border-radius: 38px;
          font-size: 17px;
          font-weight: 400;
          line-height: 1;
          color: #171e24;
          opacity: 0.5;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
          gap: 8px;
          transition:
            opacity 0.15s ease,
            color 0.15s ease,
            border-color 0.15s ease,
            background-color 0.15s ease,
            box-shadow 0.15s ease;

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
            width: 14px;
            height: 14px;
            flex-shrink: 0;
            display: block;
            line-height: 0;
            transform: translateY(1px);
          }

          &.active {
            opacity: 1;
            font-weight: 500;
            color: var(--theme-primary);
            border-color: #1f7cff;
            background: var(--surface-tint);
            box-shadow: var(--shadow-card);
          }

          &:focus-visible {
            outline: 2px solid var(--theme-primary);
            outline-offset: 2px;
          }
        }

        .navbar-item--plain {
          border-color: transparent;
          background: transparent;
          box-shadow: none;

          &.active {
            border-color: transparent;
            background: transparent;
            box-shadow: none;
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

        &--member {
          gap: 16px;
        }

        &--market-detail {
          flex: 1 1 auto;
          justify-content: flex-end;
          align-items: center;
          min-width: 0;

          .header-user-strip {
            max-width: min(360px, 38vw);
          }

        }
      }

      .header-user-strip {
        display: flex;
        align-items: center;
        flex: 1 1 auto;
        min-width: 0;
        max-width: min(440px, 46vw);
        height: 48px;
        box-sizing: border-box;
        padding: 4px 8px 4px 4px;
        gap: 10px;
        background: #ffffff;
        border: 1px solid var(--border-light);
        border-radius: 38px;
        box-shadow: 0 1px 10px rgba(13, 108, 251, 0.1);
      }

      .header-user-strip__avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }

      .header-user-strip__id {
        flex-shrink: 0;
        font-size: 16px;
        font-weight: 500;
        color: rgba(11, 52, 98, 0.58);
        line-height: 1.2;
        max-width: 128px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .header-user-strip__assets {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
        padding: 5px 14px 5px 12px;
        border-radius: 28px;
        background: rgba(228, 240, 254, 0.98);
        border: 0.8px solid rgba(13, 108, 251, 0.14);
        min-width: 0;
      }

      .header-user-strip__assets-label {
        font-size: 13px;
        font-weight: 500;
        color: rgba(11, 52, 98, 0.48);
        white-space: nowrap;
      }

      .header-user-strip__assets-value {
        font-family: $font-family-num, $font-family-base;
        font-size: 16px;
        font-weight: 700;
        color: #0d6cfb;
        letter-spacing: 0.02em;
        white-space: nowrap;
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
        border-radius: 50%;
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;

        &:hover,
        &:focus-visible {
          transform: translateY(-5px);
          box-shadow: 0 4px 8px 0 rgba(21, 58, 119, 0.18);
        }

        &:focus-visible {
          outline: 2px solid var(--theme-primary);
          outline-offset: 2px;
        }

        &__img {
          width: 48px;
          height: 48px;
          display: block;
          pointer-events: none;
          border-radius: 50%;
        }
      }
    }
  }

  .header-market-back-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    box-sizing: border-box;
    margin-right: 20px;
    border-radius: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    text-decoration: none;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.85;
    }

    &:focus-visible {
      outline: 2px solid rgba(28, 123, 255, 0.45);
      outline-offset: 2px;
      border-radius: 8px;
    }

    &__img {
      display: block;
      width: 48px;
      height: 48px;
      pointer-events: none;
    }

    &--m {
      width: 40px;
      height: 40px;
      margin-right: 0;
      margin-left: 0;
      flex-shrink: 0;

      .header-market-back-btn__img {
        width: 40px;
        height: 40px;
      }
    }
  }

  .header-beijing-bar {
    box-sizing: border-box;
    text-align: right;
    pointer-events: none;

    &__text {
      font-family: $font-family-num, $font-family-base;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.2;
      color: rgba(11, 52, 98, 0.48);
      white-space: nowrap;
    }
  }

  .header-market-detail-stack {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0;
    margin-left: auto;
    min-width: 0;
  }

  .header-market-belt-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &.header--market-detail {
    background: linear-gradient(180deg, #e3ecfb 0%, var(--theme-bg) 100%);

    @include web-only {
      height: auto;
      min-height: 0;
      padding-top: 0;
      padding-bottom: 18px;
    }

    @include mobile-only {
      background: #e3ecfb;
      padding-top: 0;
      padding-bottom: 8px;
    }

    .header-beijing-bar {
      @include web-only {
        position: absolute;
        top: 0;
        right: 44px;
        left: auto;
        width: auto;
        max-width: min(420px, 42vw);
        padding: 0;
        z-index: 2;
      }

      @include mobile-only {
        position: absolute;
        top: 4px;
        right: 8px;
        left: auto;
        width: auto;
        max-width: min(280px, 72vw);
        padding: 0;
        z-index: 2;
      }
    }
  }

  /* 与首页主导航条一致：沿用全局 .card-primary（surface-card + 白边），仅保留北京时间占位 */
  &.header--market-detail .card-primary--market-detail.norem {
    @include web-only {
      position: relative;
      margin-top: 22px;
      height: auto;
      min-height: 84px;
      padding-top: 10px;
      padding-bottom: 10px;
      align-items: center;
    }

    @include mobile-only {
      margin-top: 22px;
      justify-content: flex-start;
      gap: 0;
    }
  }
}
</style>
