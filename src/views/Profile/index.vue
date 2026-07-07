<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchProfileSummary, logoutApi } from '@/api/user';
import arrowMoreIcon from '@/assets/images/common/icon_arrow_more.svg';
import avatarDefaultUrl from '@/assets/images/common/avatar_default.png?url';
import bindInfoIcon from '@/assets/images/common/icon_profile_bindinfo.svg';
import favoritesIcon from '@/assets/images/common/icon_profile_favorites.svg';
import infoIcon from '@/assets/images/common/icon_profile_info.svg';
import marketIcon from '@/assets/images/common/icon_profile_market.svg';
import messagesIcon from '@/assets/images/common/icon_profile_messages.svg';
import ordersIcon from '@/assets/images/common/icon_profile_orders.svg';
import recordsIcon from '@/assets/images/common/icon_profile_records.svg';
import refreshIcon from '@/assets/images/common/icon_refresh.svg';
import securityIcon from '@/assets/images/common/icon_profile_security.svg';
import serviceIcon from '@/assets/images/common/icon_profile_service.svg';
import logoutIcon from '@/assets/images/common/icon_profile_logout.svg';
import verifyIcon from '@/assets/images/common/icon_profile_verify.svg';
import withdrawIcon from '@/assets/images/common/icon_withdraw.svg';
import { useAppStore } from '@/store/modules/app';
import { useToast } from '@/hooks/useToast';
import { openCustomerService } from '@/utils/customerService';
import ProfileAvatarModal from './components/ProfileAvatarModal.vue';
import ProfileBindingModal from './components/ProfileBindingModal.vue';
import ProfileInfoModal from './components/ProfileInfoModal.vue';
import ProfileLogoutModal from './components/ProfileLogoutModal.vue';
import ProfileMessagesModal from './components/ProfileMessagesModal.vue';
import ProfileModal from './components/ProfileModal.vue';
import ProfileSecurityModal from './components/ProfileSecurityModal.vue';
import ProfileVerifyModal from './components/ProfileVerifyModal.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const toast = useToast();
const { loggedInUserId, loggedInAssetsFormatted } = storeToRefs(appStore);

const activeModal = ref('');
const loading = ref(true);
const refreshing = ref(false);
const avatarDisplayUrl = ref('');
const profileSummary = ref({
  nickname: '',
  memberId: '',
  balance: '1,342,512.35',
  currency: 'CNY',
  vipLevel: 3,
  totalBet: '3,151,724.00',
  winRate: 0,
  winRateFormatted: '0%',
  totalProfit: 0,
  totalProfitFormatted: '¥0.00',
});

const displayName = computed(() => profileSummary.value.nickname || loggedInUserId.value || 'Y05741');
const displayId = computed(() => `ID：${profileSummary.value.memberId || loggedInUserId.value || 'U2026023923'}`);
const balanceValue = computed(() => {
  const summaryBalance = profileSummary.value.balance;
  if (summaryBalance && summaryBalance !== '0.00') return summaryBalance;
  if (loggedInAssetsFormatted.value && loggedInAssetsFormatted.value !== '0.00') return loggedInAssetsFormatted.value;
  return '1,342,512.35';
});
const currencyValue = computed(() => profileSummary.value.currency || 'CNY');
const isProfileHome = computed(() => route.name === 'profile');

const levels = ['V1', 'V2', 'V3', 'V4', 'V5'];

const profileActions = [
  { key: 'info', label: '个人资料', modal: 'profile', icon: infoIcon },
  { key: 'records', label: '交易记录', to: '/finance/records', icon: recordsIcon },
  { key: 'orders', label: '下单明细', to: '/trade/purchases', icon: ordersIcon },
  { key: 'favorites', label: '收藏', icon: favoritesIcon, action: 'favorites' },
  { key: 'messages', label: '消息中心', modal: 'messages', icon: messagesIcon },
  { key: 'market', label: '市场列表', to: '/market', icon: marketIcon },
  { key: 'verify', label: '实名认证', modal: 'verify', icon: verifyIcon },
  { key: 'security', label: '安全设置', modal: 'security', icon: securityIcon },
  { key: 'bind', label: '绑定信息', modal: 'binding', icon: bindInfoIcon },
  { key: 'service', label: '联系客服', icon: serviceIcon, action: 'service' },
  { key: 'logout', label: '退出登录', icon: logoutIcon, modal: 'logout' },
];

const mobileProfileActions = [
  { key: 'service', label: '联系客服', icon: serviceIcon, action: 'service' },
  { key: 'info', label: '个人资料', modal: 'profile', icon: infoIcon },
  { key: 'vip', label: 'VIP权益', to: '/vip', icon: favoritesIcon },
  { key: 'bind', label: '绑定信息', modal: 'binding', icon: bindInfoIcon },
];

const modalMetaMap = {
  avatar: { titleKey: '用户信息', subtitleKey: '头像和昵称设置' },
  profile: { titleKey: '个人资料' },
  messages: { titleKey: '消息中心', subtitleKey: '查看您的系统消息' },
  verify: { titleKey: '实名认证' },
  security: { titleKey: '安全设置' },
  binding: { titleKey: '绑定信息-提现' },
  logout: { titleKey: '提示' },
};

const activeModalMeta = computed(() => modalMetaMap[activeModal.value] || modalMetaMap.logout);

function isActionActive(item) {
  if (item.modal) return activeModal.value === item.modal;
  if (!item.to) return false;
  if (item.key === 'bind') {
    return route.path.startsWith('/profile/bank-card') || route.path.startsWith('/profile/blockchain');
  }
  if (item.to === '/market') {
    return route.name === 'market' || route.name === 'market-detail';
  }
  return route.path === item.to || route.path.startsWith(`${item.to}/`);
}

function handleAction(item) {
  if (item.modal) {
    openProfileModal(item.modal);
    return;
  }
  if (item.action === 'service') {
    openCustomerService();
    return;
  }
  if (item.action === 'favorites') {
    toast.info(t('暂无数据'));
  }
}

function openProfileModal(type) {
  activeModal.value = type;
}

function closeProfileModal() {
  activeModal.value = '';
}

function handleProfileSave() {
  toast.success(t('操作成功'));
  closeProfileModal();
}

async function loadProfileSummary() {
  try {
    loading.value = true;
    const res = await fetchProfileSummary();
    profileSummary.value = { ...profileSummary.value, ...(res.data || {}) };
  } catch {
    /* 使用 store 和默认演示数据兜底，避免个人中心白屏 */
  } finally {
    loading.value = false;
  }
}

async function refreshBalance() {
  if (refreshing.value) return;
  try {
    refreshing.value = true;
    const res = await fetchProfileSummary();
    profileSummary.value = { ...profileSummary.value, ...(res.data || {}) };
    toast.success(t('操作成功'));
  } catch {
    toast.error(t('加载失败'));
  } finally {
    refreshing.value = false;
  }
}

async function confirmLogout() {
  closeProfileModal();
  try {
    await logoutApi();
  } catch { /* 即使登出接口失败也清理本地状态 */ }
  appStore.clearWebLogin();
  toast.success(t('操作成功'));
  router.push('/');
}

onMounted(loadProfileSummary);
</script>

<template>
  <div class="profile-layout" :class="{ 'profile-layout--subpage': !isProfileHome }">
    <div class="profile-layout__inner">
      <template v-if="isProfileHome">
        <div v-if="loading" class="profile-loading-state">
          <div class="profile-loading-spinner" />
          <span>{{ t('加载中') }}</span>
        </div>

        <template v-else>
          <section class="profile-member-card" aria-label="profile-card">
          <div class="profile-member-card__body">
            <div class="profile-member-card__top">
              <button type="button" class="profile-user" @click="openProfileModal('avatar')">
                <img class="profile-user__avatar" :src="avatarDisplayUrl || avatarDefaultUrl" alt="" width="80" height="80" />
                <div class="profile-user__meta">
                  <div class="profile-user__name">{{ displayName }}</div>
                  <div class="profile-user__id">{{ displayId }}</div>
                </div>
              </button>

              <div class="profile-member-card__actions">
                <RouterLink to="/finance/deposit" class="profile-top-action">
                  <img :src="withdrawIcon" alt="" width="28" height="28" />
                  <span>{{ t('充值') }}</span>
                </RouterLink>
                <RouterLink to="/finance/withdraw" class="profile-top-action">
                  <img :src="withdrawIcon" alt="" width="28" height="28" />
                  <span>{{ t('提领') }}</span>
                </RouterLink>
              </div>
            </div>

            <div class="profile-member-card__balance">
              <span>{{ t('账户余额') }}：</span>
              <strong>{{ currencyValue }} {{ balanceValue }}</strong>
              <button
                type="button"
                class="profile-refresh"
                :class="{ 'profile-refresh--spinning': refreshing }"
                :aria-label="t('刷新余额')"
                :disabled="refreshing"
                @click="refreshBalance"
              >
                <img :src="refreshIcon" alt="" width="34" height="34" />
              </button>
            </div>

            <div class="profile-levels" aria-label="member-level">
              <RouterLink to="/vip" class="profile-levels__title profile-levels__title--link">{{ t('会员等级') }}</RouterLink>
              <div class="profile-levels__track">
                <span
                  v-for="(level, index) in levels"
                  :key="level"
                  class="profile-levels__point"
                  :class="{ 'profile-levels__point--active': index + 1 === profileSummary.vipLevel }"
                >
                  <span class="profile-levels__dot" />
                  <span class="profile-levels__label">{{ level }}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="profile-stats">
            <div class="profile-stats__item">
              <span>{{ t('总投注') }}</span>
              <strong>￥ {{ profileSummary.totalBet }}</strong>
            </div>
            <div class="profile-stats__item">
              <span>{{ t('胜率') }}</span>
              <strong>{{ profileSummary.winRateFormatted }}</strong>
            </div>
            <div class="profile-stats__item">
              <span>{{ t('总盈利') }}</span>
              <strong>{{ profileSummary.totalProfitFormatted }}</strong>
            </div>
          </div>
          </section>

          <section class="profile-balance-card card-default" aria-label="balance">
          <div class="profile-balance-card__head">
            <span>{{ t('账户余额') }}</span>
            <button
              type="button"
              class="profile-refresh"
              :class="{ 'profile-refresh--spinning': refreshing }"
              :aria-label="t('刷新余额')"
              :disabled="refreshing"
              @click="refreshBalance"
            >
              <img :src="refreshIcon" alt="" width="34" height="34" />
            </button>
          </div>
          <div class="profile-balance-card__amount">
            <strong>{{ balanceValue }}</strong>
            <span>{{ currencyValue }}</span>
          </div>
          <div class="profile-balance-card__actions">
            <RouterLink to="/finance/deposit" class="profile-balance-action profile-balance-action--primary">
              <img :src="withdrawIcon" alt="" width="28" height="28" />
              <span>{{ t('充值') }}</span>
            </RouterLink>
            <RouterLink to="/finance/withdraw" class="profile-balance-action">
              <img :src="withdrawIcon" alt="" width="28" height="28" />
              <span>{{ t('提领') }}</span>
            </RouterLink>
          </div>
          </section>

          <section class="profile-mobile-menu card-default" aria-label="profile-mobile-actions">
          <template v-for="item in mobileProfileActions" :key="item.key">
            <RouterLink v-if="item.to" :to="item.to" class="profile-mobile-action">
              <span class="profile-mobile-action__icon"><img :src="item.icon" alt="" /></span>
              <span>{{ t(item.label) }}</span>
              <img class="profile-mobile-action__arrow" :src="arrowMoreIcon" alt="" />
            </RouterLink>
            <button v-else type="button" class="profile-mobile-action" @click="handleAction(item)">
              <span class="profile-mobile-action__icon"><img :src="item.icon" alt="" /></span>
              <span>{{ t(item.label) }}</span>
              <img class="profile-mobile-action__arrow" :src="arrowMoreIcon" alt="" />
            </button>
          </template>
          </section>

          <section class="profile-action-card card-default" aria-label="profile-actions">
          <template v-for="item in profileActions" :key="item.key">
            <RouterLink
              v-if="item.to"
              :to="item.to"
              class="profile-action"
              :class="{
                'profile-action--active': isActionActive(item),
                'profile-action--desktop-only': item.desktopOnly,
              }"
            >
              <img class="profile-action__icon" :src="item.icon" alt="" width="54" height="54" />
              <span class="profile-action__label">{{ t(item.label) }}</span>
              <img class="profile-action__arrow" :src="arrowMoreIcon" alt="" width="20" height="20" />
            </RouterLink>

            <button
              v-else
              type="button"
              class="profile-action"
              :class="{ 'profile-action--desktop-only': item.desktopOnly }"
              @click="handleAction(item)"
            >
              <img class="profile-action__icon" :src="item.icon" alt="" width="54" height="54" />
              <span class="profile-action__label">{{ t(item.label) }}</span>
              <img class="profile-action__arrow" :src="arrowMoreIcon" alt="" width="20" height="20" />
            </button>
          </template>
          </section>
        </template>
      </template>

      <main v-else class="profile-subpage card-default">
        <RouterView />
      </main>
    </div>

    <ProfileModal
      :visible="Boolean(activeModal)"
      :type="activeModal"
      :title-key="activeModalMeta.titleKey"
      :subtitle-key="activeModalMeta.subtitleKey"
      @close="closeProfileModal"
    >
      <ProfileAvatarModal v-if="activeModal === 'avatar'" @save="handleProfileSave" />

      <ProfileInfoModal
        v-else-if="activeModal === 'profile'"
        @open-binding="openProfileModal('binding')"
      />
      <ProfileMessagesModal v-else-if="activeModal === 'messages'" />
      <ProfileVerifyModal v-else-if="activeModal === 'verify'" @submit="handleProfileSave" />
      <ProfileSecurityModal v-else-if="activeModal === 'security'" @submit="handleProfileSave" />
      <ProfileBindingModal v-else-if="activeModal === 'binding'" @submit="handleProfileSave" />
      <ProfileLogoutModal v-else @cancel="closeProfileModal" @confirm="confirmLogout" />
    </ProfileModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.profile-layout {
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--theme-bg);

  @include web-only {
    padding: 10px 30px 56px;
  }

  @include mobile-only {
    padding: 0 $spacing-sm calc(#{$mobile-tab-bar-offset} + env(safe-area-inset-bottom, 0px) + #{$spacing-lg});
  }
}

.profile-layout--subpage {
  @include web-only {
    padding-top: $spacing-xl;
  }
}

.profile-layout__inner {
  display: flex;
  flex-direction: column;
  margin: 0 auto;

  @include web-only {
    width: min(100%, 800px);
    gap: $spacing-xl;
  }

  @include mobile-only {
    gap: 10px;
  }
}

.profile-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  min-height: 240px;
  color: var(--theme-text);
  font-size: $font-size-md;
}

.profile-loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--theme-divider);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: profile-refresh-spin 0.8s linear infinite;
}

.profile-member-card {
  position: relative;
  overflow: hidden;
  color: var(--auxiliary-1);
  background: linear-gradient(125deg, #0f6fff 0%, #2888ff 62%, #3c98ff 100%);


  @include web-only {
    min-height: 360px;
    border-radius: $radius-xl;
  }

  @include mobile-only {
    min-height: 145px;
    border-radius: $radius-lg;
  }
}

.profile-member-card__body {
  position: relative;
  z-index: 1;

  @include web-only {
    min-height: 260px;
    padding: $spacing-2xl $spacing-2xl 18px;
    box-sizing: border-box;
  }

  @include mobile-only {
    min-height: 145px;
    padding: 18px 18px 12px;
    box-sizing: border-box;
  }
}

.profile-member-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $spacing-xl;
}

.profile-user {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  @include web-only {
    gap: $spacing-md;
  }

  @include mobile-only {
    gap: 10px;
  }
}

.profile-user__avatar {
  display: block;
  border-radius: 50%;
  object-fit: cover;
  background: var(--surface-card);
  flex-shrink: 0;

  @include web-only {
    width: 80px;
    height: 80px;
  }

  @include mobile-only {
    width: 56px;
    height: 56px;
  }
}

.profile-user__meta {
  min-width: 0;
}

.profile-user__name {
  font-family: $font-family-num, $font-family-base;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @include web-only {
    font-size: 24px;
  }

  @include mobile-only {
    font-size: $font-size-xl;
  }
}

.profile-user__id {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.82);
  font-family: $font-family-num, $font-family-base;
  line-height: 1.2;

  @include web-only {
    font-size: $font-size-md;
  }

  @include mobile-only {
    font-size: $font-size-sm;
  }
}

.profile-member-card__actions {
  display: flex;
  align-items: center;

  @include web-only {
    gap: 18px;
    padding-top: 4px;
  }

  @include mobile-only {
    display: none;
  }
}

.profile-top-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  width: 128px;
  height: 44px;
  border-radius: $radius-pill;
  background: var(--auxiliary-1);
  color: var(--theme-primary);
  font-size: $font-size-lg;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 3px 8px rgba(21, 58, 119, 0.08);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(21, 58, 119, 0.16);
  }

  @include mobile-only {
    gap: 4px;
    width: 66px;
    height: 32px;
    font-size: $font-size-sm;

    img {
      width: 18px;
      height: 18px;
    }
  }
}

.profile-member-card__balance {
  align-items: center;
  gap: $spacing-sm;
  line-height: 1;

  @include mobile-only {
    display: none;
  }

  @include web-only {
    display: flex;
    margin-top: $spacing-2xl;
    font-size: $font-size-xl;
  }

  strong {
    font-family: $font-family-num, $font-family-base;
    font-weight: 800;

    @include web-only {
      font-size: 30px;
    }

    @include mobile-only {
      font-size: 22px;
    }
  }
}

.profile-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;

  img {
    display: block;
  }
}

.profile-refresh--spinning img {
  animation: profile-refresh-spin 0.8s linear infinite;
}

.profile-refresh:disabled {
  cursor: default;
  opacity: 0.72;
}

.profile-levels {
  position: relative;

  @include web-only {
    margin-top: 52px;
  }

  @include mobile-only {
    margin-top: 30px;
    padding: 0 10px;
  }
}

.profile-levels__title {
  text-align: center;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 600;

  @include web-only {
    font-size: $font-size-base;
    margin-bottom: $spacing-sm;
  }

  @include mobile-only {
    font-size: $font-size-sm;
    margin-bottom: 5px;
  }

  &--link {
    text-decoration: none;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: #fff;
      text-decoration: underline;
    }
  }
}

.profile-levels__track {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  &::before {
    content: '';
    position: absolute;
    left: 9%;
    right: 9%;
    top: 6px;
    height: 2px;
    border-radius: $radius-pill;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
    transform: rotate(2deg);
  }
}

.profile-levels__point {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  min-width: 34px;
  color: rgba(255, 255, 255, 0.6);
  font-family: $font-family-num, $font-family-base;
  font-weight: 700;

  @include web-only {
    font-size: $font-size-md;
  }

  @include mobile-only {
    font-size: $font-size-xs;
  }
}

.profile-levels__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.38);

  @include mobile-only {
    width: 7px;
    height: 7px;
  }
}

.profile-levels__label {
  margin-top: 6px;
}

.profile-levels__point--active {
  color: var(--auxiliary-1);

  .profile-levels__dot {
    width: 0;
    height: 0;
    border-left: 9px solid transparent;
    border-right: 9px solid transparent;
    border-top: 14px solid var(--auxiliary-1);
    border-radius: 0;
    background: transparent;

    @include mobile-only {
      border-left-width: 7px;
      border-right-width: 7px;
      border-top-width: 10px;
    }
  }
}

.profile-stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: rgba(234, 241, 249, 0.94);
  color: var(--theme-text);

  @include web-only {
    height: 100px;
  }

  @include mobile-only {
    display: none;
  }
}

.profile-stats__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: $font-size-md;
  font-weight: 500;

  & + & {
    border-left: 1px solid rgba(11, 52, 98, 0.12);
  }

  strong {
    color: var(--theme-primary);
    font-family: $font-family-num, $font-family-base;
    font-weight: 800;

    @include web-only {
      font-size: 22px;
    }

    @include mobile-only {
      font-size: $font-size-base;
    }
  }

  @include mobile-only {
    gap: 5px;
    font-size: $font-size-sm;
  }
}

.profile-balance-card {
  @include web-only {
    display: none;
  }

  @include mobile-only {
    display: flex;
    flex-direction: column;
    min-height: 202px;
    padding: 16px 18px 16px;
    border-radius: $radius-lg;
    box-sizing: border-box;
  }
}

.profile-balance-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--theme-text);
  font-size: $font-size-base;
  font-weight: 700;
}

.profile-balance-card__amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: $spacing-sm;
  margin-top: 26px;
  color: var(--theme-primary);

  strong {
    font-family: $font-family-num, $font-family-base;
    font-size: 27px;
    font-weight: 800;
    line-height: 1;
  }

  span {
    font-size: $font-size-base;
    font-weight: 700;
  }
}

.profile-balance-card__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-md;
  margin-top: auto;
}

.profile-balance-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  height: 44px;
  border: 1px solid var(--theme-primary);
  border-radius: $radius-pill;
  background: var(--auxiliary-1);
  color: var(--theme-primary);
  font-size: $font-size-lg;
  font-weight: 700;
  text-decoration: none;
}

.profile-balance-action--primary {
  background: var(--theme-primary);
  color: var(--auxiliary-1);
  box-shadow: var(--shadow-primary-btn);
}

.profile-action-card {
  box-sizing: border-box;

  @include web-only {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $spacing-xl $spacing-md;
    min-height: 458px;
    padding: 22px 24px;
    border-radius: $radius-xl;
  }

  @include mobile-only {
    display: none;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    padding: 18px 20px 20px;
    border-radius: $radius-lg;
  }
}

.profile-mobile-menu {
  display: none;

  @include mobile-only {
    display: flex;
    flex-direction: column;
    padding: 12px 16px;
    border-radius: $radius-lg;
    box-sizing: border-box;
  }
}

.profile-mobile-action {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 45px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid rgba(11, 52, 98, 0.08);
  background: transparent;
  color: var(--theme-text);
  font-size: 15px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  cursor: pointer;

  &:last-child {
    border-bottom: 0;
  }
}

.profile-mobile-action__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-right: 10px;

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
}

.profile-mobile-action__arrow {
  width: 18px;
  height: 18px;
  margin-left: auto;
  opacity: 0.58;
}

.profile-action {
  position: relative;
  border: 0;
  text-decoration: none;
  cursor: pointer;
  color: var(--theme-text);
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;

  @include web-only {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    height: 124px;
    border-radius: $radius-xl;
    background: var(--surface-card);
    font-size: $font-size-lg;
    font-weight: 500;

    &:hover,
    &.profile-action--active {
      color: var(--theme-primary);
      transform: translateY(-2px);
      box-shadow: 0 8px 18px rgba(21, 58, 119, 0.12);
    }
  }

  @include mobile-only {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    min-height: 108px;
    padding: 10px $spacing-xs;
    border-radius: $radius-md;
    background: var(--surface-card);
    font-size: $font-size-md;
    font-weight: 500;
    text-align: center;

    &:hover,
    &.profile-action--active {
      color: var(--theme-primary);
      background: rgba(28, 123, 255, 0.08);
    }
  }
}

.profile-action--desktop-only {
  @include mobile-only {
    display: none;
  }
}

.profile-action__icon {
  display: block;
  object-fit: contain;
  flex-shrink: 0;

  @include web-only {
    width: 54px;
    height: 54px;
  }

  @include mobile-only {
    width: 42px;
    height: 42px;
  }
}

.profile-action__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-action__arrow {
  @include web-only {
    display: none;
  }

  @include mobile-only {
    display: none;
  }
}

.profile-subpage {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;

  @include web-only {
    padding: $spacing-3xl;
    border-radius: $radius-xl;
  }

  @include mobile-only {
    padding: $spacing-lg;
    border-radius: $radius-lg;
  }

}

.profile-subpage--home {
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  border: none;

  @include web-only {
    width: 800px;
    max-width: 100%;
    margin: 0 auto;
  }
}

@keyframes profile-refresh-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
