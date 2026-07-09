<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchProfileOverview, logoutApi } from '@/api/user';
import { useAppStore } from '@/store/modules/app';
import { useToast } from '@/hooks/useToast';
import { openCustomerService } from '@/utils/customerService';

import ProfileUserInfoModal from '@/views/Profile/components/ProfileUserInfoModal.vue';
import profileCardBgH5 from '@/assets/images/profile/profile_card_bg_h5.svg?url';
import profileCardBg from '@/assets/images/profile/profile_card_bg.svg?url';
import sunshineBg from '@/assets/images/profile/sunshine_bg.svg?url';
import avatarDefaultUrl from '@/assets/images/common/avatar_default.png?url';
import iconProfileDeposit from '@/assets/images/profile/icon_profile_deposit.svg?url';
import iconProfileDepositPc from '@/assets/images/profile/pc_icon_profile_deposit.svg?url';
import iconProfileWithdraw from '@/assets/images/profile/icon_profile_withdraw.svg?url';
import iconProfileInfo from '@/assets/images/common/icon_profile_info.svg?url';
// import iconProfileRecords from '@/assets/images/common/icon_profile_records.svg?url';
// import iconProfileOrders from '@/assets/images/common/icon_profile_orders.svg?url';
// import iconProfileFavorites from '@/assets/images/common/icon_profile_favorites.svg?url';
import iconProfileMessages from '@/assets/images/common/icon_profile_messages.svg?url';
// import iconProfileMarket from '@/assets/images/common/icon_profile_market.svg?url';
// import iconProfileVerify from '@/assets/images/common/icon_profile_verify.svg?url';
import iconProfileSecurity from '@/assets/images/common/icon_profile_security.svg?url';
import iconProfileBindinfo from '@/assets/images/common/icon_profile_bindinfo.svg?url';
import iconProfileService from '@/assets/images/common/icon_profile_service.svg?url';
import iconProfileLogout from '@/assets/images/common/icon_profile_logout.svg?url';
import iconVipRules from '@/assets/images/common/icon_vip_rules.svg?url';
import profileVipTrack from '@/assets/images/profile/profile_vip_track.svg?url';
import profileVipTrackH5 from '@/assets/images/profile/profile_vip_track_h5.png?url';
import iconBalanceRefresh from '@/assets/images/profile/icon_balance_refresh.svg?url';
import iconBalanceRefreshPc from '@/assets/images/profile/pc_icon_balance_refresh.svg?url';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const appStore = useAppStore();
const { isLoggedIn, isMobile, loggedInUserId, loggedInAssetsFormatted } = storeToRefs(appStore);

const loading = ref(true);
const refreshing = ref(false);
const showLogoutConfirm = ref(false);
const showUserInfoModal = ref(false);
const avatarDisplayUrl = ref('');

const overview = ref({
  nickname: '',
  memberId: '',
  balance: '',
  currency: 'CNY',
  vipLevel: 0,
  totalBet: '0.00',
  winRate: '0%',
  totalProfit: '0.00',
});

const vipLevels = [1, 2, 3, 4, 5];

const displayName = computed(
  () => overview.value.nickname || loggedInUserId.value || '—',
);
const displayMemberId = computed(() => overview.value.memberId || loggedInUserId.value || '—');
const displayBalance = computed(
  () => overview.value.balance || loggedInAssetsFormatted.value || '0.00',
);
const mobileDisplayName = computed(() => (isLoggedIn.value ? displayName.value : '登录'));
const mobileDisplayMemberId = computed(() => (isLoggedIn.value ? displayMemberId.value : ''));
const mobileVipLevel = computed(() => (isLoggedIn.value ? overview.value.vipLevel : 0));
const mobileVipLevels = computed(() => (isLoggedIn.value ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4]));
const mobileBalance = computed(() => (isLoggedIn.value ? displayBalance.value : '0.00'));
const mobileMainWallet = computed(() => (isLoggedIn.value ? displayBalance.value : '0'));
const mobileLockedWallet = computed(() => (isLoggedIn.value ? (overview.value._wallet?.frozen || '0.00') : '0'));

const menuItems = computed(() => {
  const profile = { label: '个人资料', icon: iconProfileInfo, action: 'userInfo' };
  const messages = { label: '消息中心', icon: iconProfileMessages, to: '/profile/messages' };
  const bankCard = { label: '绑定信息', icon: iconProfileBindinfo, to: '/profile/bank-card' };
  const service = { label: '联系客服', icon: iconProfileService, action: 'service' };
  const security = { label: '安全设置', icon: iconProfileSecurity, to: '/profile/security' };
  const logout = { label: '退出登录', icon: iconProfileLogout, action: 'logout' };
  return isLoggedIn.value ? [profile, messages, bankCard, service, security, logout] : [service];
});

const mobileMenuItems = computed(() => {
  const service = { label: '联系客服', icon: iconProfileService, action: 'service' };
  const profile = { label: '个人资料', icon: iconProfileInfo, action: 'userInfo' };
  const vip = { label: 'VIP权益', icon: iconVipRules, action: 'vip' };
  const bind = { label: '绑定信息', icon: iconProfileBindinfo, to: '/profile/bank-card' };
  return isLoggedIn.value ? [service, vip, profile, bind] : [service, vip];
});

async function loadOverview() {
  try {
    loading.value = true;
    const res = await fetchProfileOverview();
    const data = res.data || {};
    overview.value = { ...overview.value, ...data };
    appStore.updateProfile({
      nickname: data.nickname || undefined,
      balance: data.balance || undefined,
    });
  } catch {
    /* keep defaults / store values */
  } finally {
    loading.value = false;
  }
}

async function refreshBalance() {
  if (refreshing.value) return;
  try {
    refreshing.value = true;
    const res = await fetchProfileOverview();
    const data = res.data || {};
    overview.value = { ...overview.value, ...data };
    appStore.updateProfile({
      nickname: data.nickname || undefined,
      balance: data.balance || undefined,
    });
    toast.success(t('操作成功'));
  } catch {
    toast.error(t('加载失败'));
  } finally {
    refreshing.value = false;
  }
}

function handleMenuClick(item) {
  if (item.action === 'userInfo') {
    showUserInfoModal.value = true;
    return;
  }
  if (item.action === 'logout') {
    showLogoutConfirm.value = true;
    return;
  }
  if (item.action === 'service') {
    openCustomerService();
    return;
  }
  if (item.action === 'favorites') {
    toast.info(t('暂无数据'));
    return;
  }
  if (item.to) {
    router.push(item.to);
  }
}

function handleHeroClick() {
  if (isLoggedIn.value) {
    openUserInfoModal();
    return;
  }
  appStore.openLoginModal();
}

function handleRouteAction(path) {
  if (!isLoggedIn.value) {
    appStore.openLoginModal();
    return;
  }
  router.push(path);
}

function handleMobileMenuClick(item) {
  if (item.action === 'service') {
    openCustomerService();
    return;
  }
  if (item.action === 'vip') {
    toast.info(t('暂无数据'));
    return;
  }
  if (!isLoggedIn.value && item.action !== 'service') {
    appStore.openLoginModal();
    return;
  }
  handleMenuClick(item);
}

async function confirmLogout() {
  showLogoutConfirm.value = false;
  try { await logoutApi(); } catch { /* 忽略后端错误 */ }
  appStore.clearWebLogin();
  toast.success(t('操作成功'));
  router.push('/');
}

function cancelLogout() {
  showLogoutConfirm.value = false;
}

function openUserInfoModal() {
  showUserInfoModal.value = true;
}

function handleUserInfoSaved(payload) {
  overview.value.nickname = payload.nickname;
  if (payload.avatarUrl) {
    avatarDisplayUrl.value = payload.avatarUrl;
  }
}

onMounted(loadOverview);
</script>

<template>
  <div class="profile-home">
    <div v-if="loading" class="profile-home__state">
      <div class="profile-home__spinner" />
      <span>{{ t('加载中') }}</span>
    </div>

    <template v-else>
      <template v-if="isMobile">
        <section class="profile-h5-card" aria-label="profile-summary">
          <img class="profile-h5-card__bg" :src="profileCardBgH5" alt="" aria-hidden="true" />
          <img class="profile-card__sunshine" :src="sunshineBg" alt="" aria-hidden="true" />
          <button type="button" class="profile-h5-card__user" @click="handleHeroClick">
            <img class="profile-h5-card__avatar" :src="avatarDisplayUrl || avatarDefaultUrl" width="58" height="58"
              alt="" />
            <span class="profile-h5-card__meta">
              <strong>{{ mobileDisplayName }}</strong>
              <span v-if="mobileDisplayMemberId">ID： {{ mobileDisplayMemberId }}</span>
            </span>
          </button>
          <button v-if="isLoggedIn" type="button" class="profile-h5-card__arrow" :aria-label="t('个人资料')"
            @click="openUserInfoModal" />
          <div class="profile-h5-card__vip">
            <span class="profile-h5-card__vip-title">{{ t('会员等级') }}</span>
            <img class="profile-h5-card__vip-track" :src="profileVipTrackH5" width="336" height="33" alt="" />
            <div class="profile-h5-card__vip-labels" :class="`profile-h5-card__vip-labels--v${mobileVipLevel}`">
              <span v-for="level in mobileVipLevels" :key="`h5-vip-${level}`">V{{ level }}</span>
            </div>
          </div>
        </section>

        <section class="profile-h5-balance" aria-label="account-balance">
          <div class="profile-h5-balance__head">
            <h2>{{ t('账户余额') }}</h2>
            <button type="button" class="profile-h5-balance__refresh"
              :class="{ 'profile-h5-balance__refresh--spinning': refreshing }" :aria-label="t('刷新余额')"
              :disabled="refreshing" @click="refreshBalance">
              <img :src="iconBalanceRefresh" width="24" height="24" alt="" aria-hidden="true" />
            </button>
          </div>
          <div class="profile-h5-balance__amount">
            <strong>{{ mobileBalance }}</strong>
            <span>{{ overview.currency }}</span>
          </div>
          <div class="profile-h5-balance__wallets">
            <div>
              <span>{{ t('主钱包') }}</span>
              <strong>{{ mobileMainWallet }}</strong>
            </div>
            <div>
              <span>{{ t('锁定钱包') }}</span>
              <strong>{{ mobileLockedWallet }}</strong>
            </div>
          </div>
          <div class="profile-h5-balance__actions">
            <button type="button" class="profile-h5-balance__btn profile-h5-balance__btn--primary"
              @click="handleRouteAction('/finance/deposit')">
              <img :src="iconProfileDeposit" width="28" height="28" alt="" aria-hidden="true" />
              <span>{{ t('充值') }}</span>
            </button>
            <button type="button" class="profile-h5-balance__btn" @click="handleRouteAction('/finance/withdraw')">
              <img :src="iconProfileWithdraw" width="28" height="28" alt="" aria-hidden="true" />
              <span>{{ t('提现') }}</span>
            </button>
          </div>
        </section>

        <section class="profile-h5-menu" aria-label="profile-menu">
          <button v-for="item in mobileMenuItems" :key="item.label" type="button" class="profile-h5-menu__row"
            @click="handleMobileMenuClick(item)">
            <img class="profile-h5-menu__icon" :src="item.icon" width="22" height="22" alt="" />
            <span>{{ t(item.label) }}</span>
            <i aria-hidden="true" />
          </button>
        </section>
      </template>

      <template v-else>
        <section class="profile-home__hero" aria-label="profile-summary">
          <div class="profile-home__hero-bg" aria-hidden="true">
            <img class="profile-home__hero-bg-img" :src="profileCardBg" alt="" />
            <img class="profile-card__sunshine" :src="sunshineBg" alt="" />
          </div>

          <div class="profile-home__hero-main">
            <div class="profile-home__hero-top">
              <button type="button" class="profile-home__user" @click="handleHeroClick">
                <img class="profile-home__avatar" :src="avatarDisplayUrl || avatarDefaultUrl"/>
                <div v-if="!isLoggedIn" class="profile-home__user-meta">登录</div>
                <div v-else class="profile-home__user-meta">
                  <p class="profile-home__name">{{ displayName }}</p>
                  <p class="profile-home__member-id">ID：{{ displayMemberId }}</p>
                </div>
 
              </button>
              <div class="profile-home__actions">
                <div @click="handleRouteAction('/finance/deposit')" class="profile-home__action-btn">
                  <img :src="iconProfileDepositPc" width="28" height="28" alt="" aria-hidden="true" />
                  <span>{{ t('充值') }}</span>
                </div>
                <div @click="handleRouteAction('/finance/withdraw')" class="profile-home__action-btn">
                  <img :src="iconProfileWithdraw" width="28" height="28" alt="" aria-hidden="true" />
                  <span>{{ t('提现') }}</span>
                </div>
              </div>
            </div>

            <div class="profile-home__balance-row">
              <span class="profile-home__balance-label">{{ t('账户余额') }}：</span>
              <span class="profile-home__balance-value">
                {{ overview.currency }} <span class="profile-home__balance-value-number">{{ displayBalance }}</span>

              </span>
              <button type="button" class="profile-home__refresh"
                :class="{ 'profile-home__refresh--spinning': refreshing }" :aria-label="t('刷新余额')"
                :disabled="refreshing" @click="refreshBalance">
                <img :src="iconBalanceRefreshPc" width="24" height="24" alt="" aria-hidden="true" />
              </button>
            </div>

            <div class="profile-home__vip">
              <p class="profile-home__vip-title">{{ t('会员等级') }}</p>
              <img class="profile-home__vip-track" :src="profileVipTrack" width="752" height="54" alt=""
                aria-hidden="true" />
              <div class="profile-home__vip-labels">
                <span v-for="level in vipLevels" :key="`label-${level}`" class="profile-home__vip-label"
                  :class="{ 'profile-home__vip-label--active': level === overview.vipLevel }">
                  V{{ level }}
                </span>
              </div>
            </div>
          </div>

          <div class="profile-home__hero-stats">
            <div class="profile-home__stat">
              <span class="profile-home__stat-label">{{ t('主钱包') }}</span>
              <span class="profile-home__stat-value">{{ mobileMainWallet }}</span>
            </div>
            <div class="profile-home__stat">
              <span class="profile-home__stat-label">{{ t('锁定钱包') }}</span>
              <span class="profile-home__stat-value">{{ mobileLockedWallet }}</span>
            </div>
          </div>
        </section>

        <section class="profile-home__menu-panel" aria-label="profile-menu">
          <div class="profile-home__menu-grid">
            <button v-for="item in menuItems" :key="item.label" type="button" class="profile-home__menu-item"
              @click="handleMenuClick(item)">
              <img class="profile-home__menu-icon" :src="item.icon" width="54" height="54" alt="" />
              <span class="profile-home__menu-label">{{ t(item.label) }}</span>
            </button>
          </div>
        </section>
      </template>
    </template>

    <ProfileUserInfoModal v-model="showUserInfoModal" :nickname="displayName"
      :avatar-url="avatarDisplayUrl || avatarDefaultUrl" @saved="handleUserInfoSaved" />

    <Teleport to="body">
      <Transition name="confirm-fade">
        <div v-if="showLogoutConfirm" class="profile-home__overlay" @click.self="cancelLogout">
          <div class="profile-home__dialog" role="alertdialog" aria-modal="true">
            <button type="button" class="profile-home__dialog-close" :aria-label="t('关闭')" @click="cancelLogout">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </button>
            <p class="profile-home__dialog-text">{{ t('确定退出登录吗') }}</p>
            <div class="profile-home__dialog-actions">
              <button type="button" class="btn profile-home__dialog-cancel" @click="cancelLogout">
                {{ t('取消') }}
              </button>
              <button type="button" class="btn btn--primary profile-home__dialog-confirm" @click="confirmLogout">
                {{ t('确定') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.profile-h5-card {
  position: relative;
  width: 100%;
  height: 148px;
  overflow: hidden;
  background: radial-gradient(100% 100% at 50% 100%, #68B3FD 0%, #0D6CFB 100%);
  border-radius: 16px;
  border: 1px solid #FFFFFF;
}

.profile-h5-card__bg {
  position: absolute;
  width: auto;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.profile-card__sunshine {
  width: 275px;
  height: 275px;
  position: absolute;
  top: -34px;
  left: 0px;
}

.profile-h5-card__user {
  position: absolute;
  left: 18px;
  top: 18px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
}

.profile-h5-card__avatar {
  display: block;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.88);
  background: #fff;
  object-fit: cover;
}

.profile-h5-card__meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  color: #fff;

  strong {
    font-size: 18px;
    font-weight: 500;
  }

  span {
    font-size: 14px;
    font-weight: 400;
    line-height: 1.1;
    opacity: 0.88;
    white-space: nowrap;
  }
}

.profile-h5-card__arrow {
  position: absolute;
  right: 20px;
  top: 41px;
  z-index: 1;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
}

.profile-h5-card__arrow::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-top: 2px solid #fff;
  border-right: 2px solid #fff;
  transform: rotate(45deg);
}

.profile-h5-card__vip {
  position: absolute;
  left: 38px;
  right: 38px;
  bottom: 15px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-h5-card__vip-title {
  margin-bottom: 2px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
}

.profile-h5-card__vip-track {
  display: block;
  width: 100%;
  height: 33px;
  object-fit: fill;
}

.profile-h5-card__vip-labels {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  text-align: center;

  span {
    min-width: 0;
  }

  &--v0 span:first-child,
  &--v1 span:first-child,
  &--v2 span:nth-child(2),
  &--v3 span:nth-child(3),
  &--v4 span:nth-child(4),
  &--v5 span:nth-child(5) {
    color: #fff;
    font-size: 18px;
  }
}

.profile-h5-balance {
  margin-top: 8px;
  padding: 16px;
  border-radius: 18px;
  background: #fff;
}

.profile-h5-balance__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    color: #0b3462;
    font-size: 16px;
    font-weight: 500;
    line-height: 1.1;
  }
}

.profile-h5-balance__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;

  img {
    display: block;
    width: 24px;
    height: 24px;
  }

  &--spinning img {
    animation: profile-home-spin 0.8s linear infinite;
  }

  &:disabled {
    opacity: 0.7;
    cursor: default;
  }
}

.profile-h5-balance__amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  margin: 18px 0 10px;
  color: #1c7bff;

  strong {
    font-family: $font-family-num, $font-family-base;
    font-size: 30px;
    font-weight: 700;
  }

  span {
    font-size: 20px;
    font-weight: 500;
  }
}

.profile-h5-balance__wallets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
  margin-bottom: 16px;

  div {
    display: flex;
    height: 40px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border-radius: 6px;
    background: #e3eefb;
    color: #0b3462;
  }

  span {
    color: #0B346280;
    font-size: 12px;
    font-weight: 500;
  }

  strong {
    font-family: $font-family-num, $font-family-base;
    font-size: 14px;
    font-weight: 600;
  }
}

.profile-h5-balance__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
}

.profile-h5-balance__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 44px;
  border: 1px solid #1c7bff;
  border-radius: 32px;
  background: transparent;
  color: #1c7bff;
  font-size: 18px;
  font-weight: 400;

  img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  &--primary {
    background: #1c7bff;
    color: #fff;
    box-shadow: 0 3px 8px rgba(21, 58, 119, 0.1);
  }

  &:nth-child(2) {
    background: #EAF1F9;
  }
}

.profile-h5-menu {
  margin-top: 8px;
  padding: 12px 16px;
  border-radius: 16px;
  background: #fff;
}

.profile-h5-menu__row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 44px;
  padding: 0;
  border: none;
  border-bottom: 1px solid #E4F0FE;
  background: transparent;
  color: #0b3462;
  font-size: 14px;
  font-weight: 400;
  text-align: left;

  &:last-child {
    border-bottom: none;
  }

  i {
    width: 8px;
    height: 8px;
    justify-self: end;
    border-top: 2px solid #0B346280;
    border-right: 2px solid #0B346280;
    transform: rotate(45deg);
  }
}

.profile-h5-menu__icon {
  display: block;
  width: 24px;
  height: 24px;
}

.profile-home {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  .profile-home__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 240px;
    color: var(--theme-text-1);
    font-size: $font-size-md;
  }

  .profile-home__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: profile-home-spin 0.8s linear infinite;
  }

  .profile-home__hero {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    overflow: hidden;
    height: 360px;
    box-shadow: 0px 6px 20px 0px #153A772E;

    @include web-only {
      border-radius: 32px;
    }
  }

  .profile-home__hero-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    border-radius: 32px;
    border: 1px solid #FFFFFF;
    z-index: 2;

    .profile-card__sunshine {
      top: -24px;
    }
  }

  .profile-home__hero-bg-img {
    position: absolute;
    display: block;
    max-width: none;
    width: 100%;
    height: 100%;
    user-select: none;
  }

  .profile-home__hero-main {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    background: radial-gradient(100% 100% at 50% 100%, #68B3FD 0%, #0D6CFB 100%);
    padding: 24px;
  }

  .profile-home__hero-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .profile-home__hero-stats {
    position: relative;
    z-index: 1;
    display: grid;
    height: 100px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: center;
    padding: 0 24px;
    box-sizing: border-box;
    background: #EAF1F9;
  }

  .profile-home__user {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    .profile-home__user-meta {
      font-size: 22px;
      font-weight: 500;
      color: #FFFFFF;
    }
  }

  .profile-home__avatar {
    flex-shrink: 0;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid #FFFFFF;
    background: #fff;
  }

  .profile-home__user-meta {
    min-width: 0;
  }

  .profile-home__name {
    margin: 0 0 2px;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
  }

  .profile-home__member-id {
    margin: 0;
    font-size: 14px;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.88);
  }

  .profile-home__actions {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
  }

  .profile-home__action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 128px;
    height: 44px;
    padding: 0 30px;
    border-radius: 32px;
    background: #fff;
    color: var(--theme-primary);
    font-size: $font-size-base;
    font-weight: 400;
    text-decoration: none;
    box-sizing: border-box;
    font-size: 18px;
    cursor: pointer;

    img {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      object-fit: contain;
    }
  }

  .profile-home__balance-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
    color: #fff;
  }

  .profile-home__balance-label {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.88);
  }

  .profile-home__balance-value {
    font-size: 20px;
    font-weight: 400;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 5px;

    .profile-home__balance-value-number {
      font-family: $font-family-num, $font-family-base;
      font-size: 30px;
      font-weight: 700;
    }
  }

  .profile-home__refresh {
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    cursor: pointer;

    img {
      display: block;
      width: 24px;
      height: 24px;
    }

    &--spinning img {
      animation: profile-home-spin 0.8s linear infinite;
    }

    &:disabled {
      opacity: 0.7;
      cursor: default;
    }
  }

  .profile-home__vip {
    margin-top: auto;
    margin-bottom: 0;
    padding-bottom: 8px;
    text-align: center;
    color: #fff;
  }

  .profile-home__vip-title {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.88);
  }

  .profile-home__vip-track {
    display: block;
    width: 100%;
    max-width: none;
    height: auto;
    margin: 0 auto 6px;
  }

  .profile-home__vip-labels {
    display: flex;
    justify-content: space-between;
    max-width: 752px;
    margin: 0 auto;
    padding: 0 2px;
  }

  .profile-home__vip-label {
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.55);

    &--active {
      color: #fff;
      font-size: 16px;
      font-weight: 700;
    }
  }

  .profile-home__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    height: 54px;
    min-width: 0;
    text-align: center;

    &:not(:last-child) {
      border-right: 1.5px solid #0B346280;
    }
  }

  .profile-home__stat-label {
    font-size: 14px;
    color: #0B3462;
  }

  .profile-home__stat-value {
    font-family: $font-family-num, $font-family-base;
    font-size: 24px;
    font-weight: 700;
    color: var(--theme-primary);
  }

  .profile-home__menu-panel {
    margin-top: 20px;
    padding: 22px 24px;
    border-radius: 32px;
    background: #fff;
    box-shadow: 0px 6px 20px 0px #153A772E;
    height: 474px;
  }

  .profile-home__menu-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;

    @include web-only {
      gap: 12px;
    }
  }

  .profile-home__menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border-radius: 24px;
    background: #eaf1f9;
    cursor: pointer;
    text-align: center;
    transition: transform 0.1s ease, opacity 0.2s ease;
    height: 124px;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover {
      opacity: 0.88;
    }
  }

  .profile-home__menu-icon {
    width: 54px;
    height: 54px;
    object-fit: contain;
  }

  .profile-home__menu-label {
    font-size: 18px;
    color: #0b3462;
  }

  .profile-home__overlay {
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(11, 52, 98, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }

  .profile-home__dialog {
    position: relative;
    width: min(360px, calc(100vw - 48px));
    padding: 32px 24px 24px;
    border-radius: $radius-lg;
    background: var(--surface-card);
    text-align: center;
    box-shadow: var(--shadow-card);
  }

  .profile-home__dialog-close {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: rgba(11, 52, 98, 0.35);
    cursor: pointer;
  }

  .profile-home__dialog-text {
    font-size: $font-size-base;
    font-weight: 500;
    color: var(--theme-text);
    margin: 0 0 24px;
  }

  .profile-home__dialog-actions {
    display: flex;
    gap: $spacing-md;
  }

  .profile-home__dialog-cancel,
  .profile-home__dialog-confirm {
    flex: 1;
    height: 44px;
  }

  .profile-home__dialog-cancel {
    border: 1.5px solid var(--theme-divider);
    background: #fff;
    color: var(--theme-text);
  }
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

@keyframes profile-home-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
