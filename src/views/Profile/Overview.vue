<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchProfileOverview } from '@/api/user';
import { useAppStore } from '@/store/modules/app';
import { useToast } from '@/hooks/useToast';
import { openCustomerService } from '@/utils/customerService';

import ProfileUserInfoModal from '@/views/Profile/components/ProfileUserInfoModal.vue';
import ProfileMessagesModal from '@/views/Profile/components/ProfileMessagesModal.vue';
import ProfileVerifyModal from '@/views/Profile/components/ProfileVerifyModal.vue';
import ProfileSecurityModal from '@/views/Profile/components/ProfileSecurityModal.vue';
import ProfileLogoutConfirmModal from '@/views/Profile/components/ProfileLogoutConfirmModal.vue';

import avatarDefaultUrl from '@/assets/images/common/avatar_default.png?url';
import iconProfileDeposit from '@/assets/images/profile/icon_profile_deposit.svg?url';
import iconProfileWithdraw from '@/assets/images/profile/icon_profile_withdraw.svg?url';
import iconProfileInfo from '@/assets/images/common/icon_profile_info.svg?url';
import iconProfileRecords from '@/assets/images/common/icon_profile_records.svg?url';
import iconProfileOrders from '@/assets/images/common/icon_profile_orders.svg?url';
import iconProfileFavorites from '@/assets/images/common/icon_profile_favorites.svg?url';
import iconProfileMessages from '@/assets/images/common/icon_profile_messages.svg?url';
import iconProfileMarket from '@/assets/images/common/icon_profile_market.svg?url';
import iconProfileVerify from '@/assets/images/common/icon_profile_verify.svg?url';
import iconProfileSecurity from '@/assets/images/common/icon_profile_security.svg?url';
import iconProfileBindinfo from '@/assets/images/common/icon_profile_bindinfo.svg?url';
import iconProfileService from '@/assets/images/common/icon_profile_service.svg?url';
import iconProfileLogout from '@/assets/images/common/icon_profile_logout.svg?url';
import profileCardBg from '@/assets/images/profile/profile-card.svg?url';
import profileVipTrack from '@/assets/images/profile/profile_vip_track.svg?url';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const appStore = useAppStore();
const { loggedInUserId, loggedInAssetsFormatted } = storeToRefs(appStore);

const loading = ref(true);
const refreshing = ref(false);
const showLogoutConfirm = ref(false);
const showUserInfoModal = ref(false);
const showMessagesModal = ref(false);
const showVerifyModal = ref(false);
const showSecurityModal = ref(false);
const avatarDisplayUrl = ref('');

const overview = ref({
  nickname: '',
  memberId: '',
  balance: '',
  currency: 'CNY',
  vipLevel: 3,
  totalBet: '0.00',
  winRate: '0%',
  totalProfit: '0.00',
});

const vipLevels = [1, 2, 3, 4, 5];

const displayName = computed(
  () => overview.value.nickname || loggedInUserId.value || 'User_888',
);
const displayMemberId = computed(() => overview.value.memberId || loggedInUserId.value || '—');
const displayBalance = computed(
  () => overview.value.balance || loggedInAssetsFormatted.value || '0.00',
);

const menuItems = [
  { label: '个人资料', icon: iconProfileInfo, action: 'userInfo' },
  { label: '交易记录', icon: iconProfileRecords, to: '/finance/records' },
  { label: '下单明细', icon: iconProfileOrders, to: '/trade/purchases' },
  { label: '收藏', icon: iconProfileFavorites, action: 'favorites' },
  { label: '消息中心', icon: iconProfileMessages, action: 'messages' },
  { label: '市场列表', icon: iconProfileMarket, to: '/market' },
  { label: '实名认证', icon: iconProfileVerify, action: 'verify' },
  { label: '安全设置', icon: iconProfileSecurity, action: 'security' },
  { label: '绑定信息', icon: iconProfileBindinfo, to: '/profile/bank-card' },
  { label: '联系客服', icon: iconProfileService, action: 'service' },
  { label: '退出登录', icon: iconProfileLogout, action: 'logout' },
];

async function loadOverview() {
  try {
    loading.value = true;
    const res = await fetchProfileOverview();
    overview.value = { ...overview.value, ...(res.data || {}) };
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
    overview.value = { ...overview.value, ...(res.data || {}) };
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
  if (item.action === 'messages') {
    showMessagesModal.value = true;
    return;
  }
  if (item.action === 'verify') {
    showVerifyModal.value = true;
    return;
  }
  if (item.action === 'security') {
    showSecurityModal.value = true;
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

function confirmLogout() {
  showLogoutConfirm.value = false;
  appStore.clearWebLogin();
  toast.success(t('操作成功'));
  router.push('/');
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
      <section class="profile-home__hero" aria-label="profile-summary">
        <div class="profile-home__hero-bg" aria-hidden="true">
          <img class="profile-home__hero-bg-img" :src="profileCardBg" alt="" />
        </div>

        <div class="profile-home__hero-main">
          <div class="profile-home__hero-top">
            <button type="button" class="profile-home__user" @click="openUserInfoModal">
              <img
                class="profile-home__avatar"
                :src="avatarDisplayUrl || avatarDefaultUrl"
                width="52"
                height="52"
                alt=""
              />
              <div class="profile-home__user-meta">
                <p class="profile-home__name">{{ displayName }}</p>
                <p class="profile-home__member-id">ID：{{ displayMemberId }}</p>
              </div>
            </button>
            <div class="profile-home__actions">
              <RouterLink to="/finance/deposit" class="profile-home__action-btn">
                <img :src="iconProfileDeposit" width="28" height="28" alt="" aria-hidden="true" />
                <span>{{ t('充值') }}</span>
              </RouterLink>
              <RouterLink to="/finance/withdraw" class="profile-home__action-btn">
                <img :src="iconProfileWithdraw" width="28" height="28" alt="" aria-hidden="true" />
                <span>{{ t('提现') }}</span>
              </RouterLink>
            </div>
          </div>

          <div class="profile-home__balance-row">
            <span class="profile-home__balance-label">{{ t('账户余额') }}：</span>
            <span class="profile-home__balance-value">
              {{ overview.currency }} {{ displayBalance }}
            </span>
            <button
              type="button"
              class="profile-home__refresh"
              :class="{ 'profile-home__refresh--spinning': refreshing }"
              :aria-label="t('刷新余额')"
              :disabled="refreshing"
              @click="refreshBalance"
            />
          </div>

          <div class="profile-home__vip">
            <p class="profile-home__vip-title">{{ t('会员等级') }}</p>
            <img
              class="profile-home__vip-track"
              :src="profileVipTrack"
              width="752"
              height="54"
              alt=""
              aria-hidden="true"
            />
            <div class="profile-home__vip-labels">
              <span
                v-for="level in vipLevels"
                :key="`label-${level}`"
                class="profile-home__vip-label"
                :class="{ 'profile-home__vip-label--active': level === overview.vipLevel }"
              >
                V{{ level }}
              </span>
            </div>
          </div>
        </div>

        <div class="profile-home__hero-stats">
          <div class="profile-home__stat">
            <span class="profile-home__stat-label">{{ t('总投注') }}</span>
            <span class="profile-home__stat-value">¥ {{ overview.totalBet }}</span>
          </div>
          <div class="profile-home__stat">
            <span class="profile-home__stat-label">{{ t('胜率') }}</span>
            <span class="profile-home__stat-value">{{ overview.winRate }}</span>
          </div>
          <div class="profile-home__stat">
            <span class="profile-home__stat-label">{{ t('总盈利') }}</span>
            <span class="profile-home__stat-value profile-home__stat-value--profit">
              + ¥ {{ overview.totalProfit }}
            </span>
          </div>
        </div>
      </section>

      <section class="profile-home__menu-panel" aria-label="profile-menu">
        <div class="profile-home__menu-grid">
          <button
            v-for="item in menuItems"
            :key="item.label"
            type="button"
            class="profile-home__menu-item"
            @click="handleMenuClick(item)"
          >
            <img class="profile-home__menu-icon" :src="item.icon" width="54" height="54" alt="" />
            <span class="profile-home__menu-label">{{ t(item.label) }}</span>
          </button>
        </div>
      </section>
    </template>

    <ProfileUserInfoModal
      v-model="showUserInfoModal"
      :nickname="displayName"
      :avatar-url="avatarDisplayUrl || avatarDefaultUrl"
      @saved="handleUserInfoSaved"
    />

    <ProfileMessagesModal v-model="showMessagesModal" />
    <ProfileVerifyModal v-model="showVerifyModal" />
    <ProfileSecurityModal v-model="showSecurityModal" />
    <ProfileLogoutConfirmModal
      v-model="showLogoutConfirm"
      @confirm="confirmLogout"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.profile-home {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 240px;
    color: var(--theme-text-1);
    font-size: $font-size-md;
  }

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: profile-home-spin 0.8s linear infinite;
  }

  &__hero {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    aspect-ratio: 800 / 360;
    overflow: hidden;
    border-radius: 24px;

    @include web-only {
      border-radius: 32px;
    }
  }

  &__hero-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  &__hero-bg-img {
    position: absolute;
    display: block;
    max-width: none;
    width: calc(100% * 840 / 800);
    height: calc(100% * 400 / 360);
    left: calc(-100% * 20 / 800);
    top: calc(-100% * 14 / 360);
    object-fit: fill;
    user-select: none;
  }

  &__hero-main {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    padding: 0 14px;

    @include web-only {
      padding: 0 24px;
    }
  }

  &__hero-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 16px 0 12px;

    @include web-only {
      padding: 24px 0 16px;
    }
  }

  &__hero-stats {
    position: relative;
    z-index: 1;
    display: grid;
    flex: 0 0 100px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: center;
    gap: 0;
    padding: 0 14px;
    box-sizing: border-box;

    @include web-only {
      padding: 0 24px;
    }
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
  }

  &__avatar {
    flex-shrink: 0;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.85);
    background: #fff;
  }

  &__user-meta {
    min-width: 0;
  }

  &__name {
    margin: 0 0 2px;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
  }

  &__member-id {
    margin: 0;
    font-size: 14px;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.88);
  }

  &__actions {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
  }

  &__action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 88px;
    height: 44px;
    padding: 0 12px;
    border-radius: 32px;
    background: #fff;
    color: var(--theme-primary);
    font-size: $font-size-base;
    font-weight: 500;
    text-decoration: none;
    box-sizing: border-box;

    img {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      object-fit: contain;
    }
  }

  &__balance-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
    color: #fff;
  }

  &__balance-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.88);
  }

  &__balance-value {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #fff;

    @include web-only {
      font-size: 22px;
    }
  }

  &__refresh {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    background: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22' fill='none'%3E%3Cpath d='M18.7 11a7.7 7.7 0 1 1-2.2-5.4' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round'/%3E%3Cpath d='M18.7 4.4V11h-6.6' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    cursor: pointer;

    &--spinning {
      animation: profile-home-spin 0.8s linear infinite;
    }

    &:disabled {
      opacity: 0.7;
      cursor: default;
    }
  }

  &__vip {
    margin-top: auto;
    margin-bottom: 0;
    padding-bottom: 8px;
    text-align: center;
    color: #fff;
  }

  &__vip-title {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.88);
  }

  &__vip-track {
    display: block;
    width: 100%;
    max-width: none;
    height: auto;
    margin: 0 auto 6px;
  }

  &__vip-labels {
    display: flex;
    justify-content: space-between;
    max-width: 752px;
    margin: 0 auto;
    padding: 0 2px;
  }

  &__vip-label {
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.55);

    &--active {
      color: #fff;
      font-size: 16px;
      font-weight: 700;
    }
  }

  &__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0 8px;
    text-align: center;

    &:not(:last-child) {
      border-right: 1px solid rgba(11, 52, 98, 0.12);
    }
  }

  &__stat-label {
    font-size: 14px;
    color: rgba(11, 52, 98, 0.55);
  }

  &__stat-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--theme-primary);
    word-break: break-all;

    &--profit {
      color: var(--theme-primary);
    }
  }

  &__menu-panel {
    margin-top: 12px;
    padding: 14px 10px 16px;
    border-radius: 20px;
    background: #fff;
    border: 1px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 6px 20px rgba(21, 58, 119, 0.18);

    @include web-only {
      margin-top: 16px;
      padding: 20px 16px 24px;
      border-radius: 32px;
    }
  }

  &__menu-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;

    @include web-only {
      gap: 12px;
    }
  }

  &__menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-height: 96px;
    padding: 10px 4px;
    border: none;
    border-radius: 16px;
    background: #eaf1f9;
    cursor: pointer;
    text-align: center;
    transition: transform 0.1s ease, opacity 0.2s ease;

    @include web-only {
      min-height: 124px;
      padding: 18px 8px;
      border-radius: 24px;

      &:hover {
        opacity: 0.88;
      }
    }

    &:active {
      transform: scale(0.97);
    }
  }

  &__menu-icon {
    width: 44px;
    height: 44px;
    object-fit: contain;

    @include web-only {
      width: 54px;
      height: 54px;
    }
  }

  &__menu-label {
    font-size: 13px;
    line-height: 1.25;
    color: #0b3462;

    @include web-only {
      font-size: 18px;
    }
  }

}

@keyframes profile-home-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
