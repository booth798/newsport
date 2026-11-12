<script setup>
/**
 * PC / H5 右侧导航抽屉（对齐 Figma 1510:11242）
 * - 顶部 Logo
 * - 快捷入口 2×2：充值 / 提现 / 会员互转 / 共赢伙伴
 * - 折叠分组：市场、会员服务、我的权益
 * - 底部联络客服
 */
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import logoUrl from '@/assets/images/common/logo_brand.png';
import chevronUp from '@/assets/images/common/icon_drawer_section_chevron_up.png';
import chevronDown from '@/assets/images/common/icon_drawer_section_chevron_down.png';
import bgScoreUrl from '@/assets/images/events/bg_grid_pattern.png?url';

import iconDeposit from '@/assets/images/menu/icon_deposit.svg';
import iconWithdraw from '@/assets/images/common/icon_withdraw.png';
import iconVipTransfer from '@/assets/images/profile/vip_transfer_icon.svg';

import iconMarketList from '@/assets/images/menu/icon_market_list.svg';
import iconMatchResults from '@/assets/images/menu/icon_match_results.svg';
// import iconLiveScores from '@/assets/images/menu/icon_live_scores.svg';

import iconVipBenefits from '@/assets/images/profile/vip_benefits_icon.svg';
import iconAbout from '@/assets/images/menu/icon_about_unibet.svg';

import iconMy from '@/assets/images/menu/icon_my.png';
import iconPersonalProfile from '@/assets/images/menu/icon_personal_profile.svg';
import iconSettings from '@/assets/images/menu/icon_settings.svg';
import iconContact from '@/assets/images/menu/icon_my_contact_support.png';

import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { useToast } from '@/hooks/useToast';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  /** 兼容旧调用；菜单以设计稿为准，内部自维护 */
  menus: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();
const toast = useToast();

// 抽屉打开时锁定背后滚动，关闭后恢复，避免影响页面其它元素布局。
useBodyScrollLock(() => props.modelValue);

/** 快捷入口：设计稿 2×2 */
const quickLinks = [
  { labelKey: '充值', to: '/finance/deposit', icon: iconDeposit },
  { labelKey: '提现', to: '/finance/withdraw', icon: iconWithdraw },
  { labelKey: '会员互转', to: '/finance/vip-transfer', icon: iconVipTransfer },
];

/** 折叠分组：市场 / 会员服务 / 我的权益 */
const sections = [
  {
    menuKey: 'market',
    titleKey: '市场',
    items: [
      { labelKey: '市场列表', to: '/market', icon: iconMarketList },
      { labelKey: '赛事结果', to: '/match-results', icon: iconMatchResults },
      // { labelKey: '即时比分', to: '/live-scores', icon: iconLiveScores },
    ],
  },
  {
    menuKey: 'member',
    titleKey: '会员服务',
    items: [
      { labelKey: 'VIP权益', to: '/profile/vipBenefits', icon: iconVipBenefits },
      { labelKey: '关于我们', to: '/profile/about', icon: iconAbout },
    ],
  },
  {
    menuKey: 'myBenefit',
    titleKey: '我的权益',
    items: [
      { labelKey: '我的', to: '/profile', icon: iconMy },
      // 个人资料：打开弹窗，不再跳转 /profile/info
      { labelKey: '个人资料', action: 'profileInfo', icon: iconPersonalProfile },
      { labelKey: '设置', to: '/profile/security', icon: iconSettings },
    ],
  },
];

const sectionOpen = ref({
  market: true,
  member: true,
  myBenefit: true,
});

function toggleSection(menuKey) {
  sectionOpen.value[menuKey] = !sectionOpen.value[menuKey];
}

function close() {
  emit('update:modelValue', false);
}

// 路由变化时自动关闭抽屉，避免跳转后仍遮挡页面
watch(
  () => route.fullPath,
  () => {
    if (props.modelValue) close();
  },
);

function isLinkActive(item) {
  const to = item.to;
  if (!to) return false;
  if (to === '/market') {
    return route.name === 'market' || route.name === 'market-league' || route.name === 'market-detail';
  }
  if (to === '/finance/deposit') return route.name === 'finance-deposit';
  if (to === '/finance/withdraw') return route.name === 'finance-withdraw';
  if (to === '/finance/vip-transfer') return route.name === 'finance-vip-transfer';
  if (to === '/live-scores') return route.name === 'live-scores';
  if (to === '/match-results') return route.name === 'match-results';
  if (to === '/profile/vipBenefits') return route.name === 'vip-benefits';
  if (to === '/profile/about') return route.name === 'profile-about';
  if (to === '/profile') return route.name === 'profile' || route.name === 'profile-home';
  if (to === '/profile/security') return route.name === 'profile-security';
  return route.path === to;
}

function onItemClick(item) {
  if (item.action === 'soon') {
    toast.info(t('暂无数据'));
    return;
  }
  // 个人资料：PC/H5 统一打开头像昵称弹窗
  if (item.action === 'profileInfo') {
    close();
    if (!userStore.isLoggedIn) {
      appStore.openLoginConfirm();
      return;
    }
    appStore.openProfileUserInfoModal();
    return;
  }
  if (item.to) {
    router.push(item.to);
    close();
  }
}

function onContact() {
  close();
  appStore.openCustomerServiceConfirm();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="mobile-nav-drawer-transition">
      <div v-if="modelValue" class="nav-drawer">
        <div class="nav-drawer__backdrop" @click="close" />
        <aside
          class="nav-drawer__panel"
          role="dialog"
          aria-modal="true"
          :aria-label="t('菜单')"
          @click.stop
        >
          <div class="nav-drawer__arena">
            <img class="nav-drawer__arena-bg" :src="bgScoreUrl" alt="" aria-hidden="true" />
            <div class="nav-drawer__scroll">
              <header class="nav-drawer__header">
                <div class="nav-drawer__logo-wrap">
                  <img class="nav-drawer__logo" :src="logoUrl" alt="Ladbrokes" />
                </div>
              </header>

              <div class="nav-drawer__main">
                <!-- 快捷入口 2×2 -->
                <div class="nav-drawer__quick">
                  <button
                    v-for="item in quickLinks"
                    :key="item.labelKey"
                    type="button"
                    class="nav-drawer__tile"
                    :class="{ 'is-active': isLinkActive(item) }"
                    @click="onItemClick(item)"
                  >
                    <img class="nav-drawer__tile-icon" :src="item.icon" alt="" />
                    <span class="nav-drawer__tile-label">{{ t(item.labelKey) }}</span>
                  </button>
                </div>

                <!-- 折叠分组 -->
                <div
                  v-for="sec in sections"
                  :key="sec.menuKey"
                  class="nav-drawer__section"
                >
                  <button
                    type="button"
                    class="nav-drawer__section-head"
                    :aria-expanded="sectionOpen[sec.menuKey]"
                    @click="toggleSection(sec.menuKey)"
                  >
                    <span class="nav-drawer__section-title">{{ t(sec.titleKey) }}</span>
                    <img
                      class="nav-drawer__section-chevron"
                      :src="sectionOpen[sec.menuKey] ? chevronUp : chevronDown"
                      alt=""
                    />
                  </button>
                  <div v-show="sectionOpen[sec.menuKey]" class="nav-drawer__section-body">
                    <div class="nav-drawer__link-grid">
                      <button
                        v-for="sub in sec.items"
                        :key="sub.labelKey"
                        type="button"
                        class="nav-drawer__tile"
                        :class="{ 'is-active': isLinkActive(sub) }"
                        @click="onItemClick(sub)"
                      >
                        <img class="nav-drawer__tile-icon" :src="sub.icon" alt="" />
                        <span class="nav-drawer__tile-label">{{ t(sub.labelKey) }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 联络客服 -->
                <div class="nav-drawer__footer">
                  <button type="button" class="nav-drawer__tile nav-drawer__contact" @click="onContact">
                    <img class="nav-drawer__tile-icon" :src="iconContact" alt="" />
                    <span class="nav-drawer__tile-label">{{ t('联络客服') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

/* 设计稿尺寸：面板约 288，磁贴 120×40，间距 12/10 */
$drawer-w: 288px;
$drawer-pad-x: 18px;
$tile-w: 120px;
$tile-h: 40px;
$tile-gap-x: 12px;
$tile-gap-y: 10px;
$tile-radius: 8px;
$divider-gap: 16px;

@mixin drawer-tile-surface {
  box-sizing: border-box;
  width: $tile-w;
  height: $tile-h;
  background:
    linear-gradient(360deg, rgba(var(--theme-primary-rgb), 0) 0%, rgba(var(--theme-primary-rgb), 0.15) 100%),
    linear-gradient(0deg, #ffffff, #ffffff);
  border: 0.8px solid #ffffff;
  box-shadow: 0 2px 6px 0 rgba(var(--theme-shadow-rgb), 0.1);
  border-radius: $tile-radius;
}

@mixin drawer-tile-grid {
  display: grid;
  grid-template-columns: $tile-w $tile-w;
  column-gap: $tile-gap-x;
  row-gap: $tile-gap-y;
  justify-content: start;
}

.nav-drawer {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.nav-drawer__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(var(--theme-shadow-rgb), 0.45);
}

.nav-drawer__panel {
  position: relative;
  height: 100%;
  width: min($drawer-w, 100%);
  max-width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  border-radius: 16px 0 0 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: -6px 0 24px rgba(var(--theme-shadow-rgb), 0.12);
}

.nav-drawer__arena {
  position: relative;
  height: 100%;
  overflow: hidden;
  background-color: #fff;
}

.nav-drawer__arena-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  pointer-events: none;
  opacity: 0.88;
}

.nav-drawer__scroll {
  position: relative;
  z-index: 1;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 0 $drawer-pad-x;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
}

.nav-drawer__header {
  padding: 20px 0 16px;
  box-sizing: border-box;
}

.nav-drawer__logo-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.nav-drawer__logo {
  width: 100px;
  height: auto;
  max-height: 36px;
  object-fit: contain;
  display: block;
}

.nav-drawer__main {
  padding: 0;
  box-sizing: border-box;
}

.nav-drawer__quick {
  @include drawer-tile-grid;
}

.nav-drawer__tile {
  @include drawer-tile-surface;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding: 0 8px;
  margin: 0;
  border: 0.8px solid #ffffff;
  cursor: pointer;
  font-family: $font-family-base;
  color: #1f2227;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.15;
  text-align: left;
  -webkit-tap-highlight-color: transparent;

  &.is-active {
    border-color: rgba(var(--theme-primary-rgb), 0.75);
    color: var(--theme-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--theme-primary);
    outline-offset: 1px;
  }
}

.nav-drawer__tile-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
  display: block;
}

.nav-drawer__tile-label {
  flex: 1;
  min-width: 0;
  display: block;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-drawer__section {
  border-top: 1px solid #e8eaef;
  margin-top: $divider-gap;
  padding-top: $divider-gap;
  box-sizing: border-box;
}

.nav-drawer__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 0 10px;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: $font-family-base;
}

.nav-drawer__section-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  color: var(--theme-primary);
}

.nav-drawer__section-chevron {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: block;
  object-fit: contain;
}

.nav-drawer__link-grid {
  @include drawer-tile-grid;
}

.nav-drawer__footer {
  border-top: 1px solid #e8eaef;
  margin-top: $divider-gap;
  padding-top: $divider-gap;
  padding-bottom: 4px;
  box-sizing: border-box;
  @include drawer-tile-grid;
}

.mobile-nav-drawer-transition-enter-active,
.mobile-nav-drawer-transition-leave-active {
  .nav-drawer__backdrop {
    transition: opacity 0.25s ease;
  }

  .nav-drawer__panel {
    transition: transform 0.28s ease;
  }
}

.mobile-nav-drawer-transition-enter-from,
.mobile-nav-drawer-transition-leave-to {
  .nav-drawer__backdrop {
    opacity: 0;
  }

  .nav-drawer__panel {
    transform: translateX(100%);
  }
}
</style>
