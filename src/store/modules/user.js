import { defineStore } from 'pinia';

import { clearSession } from '@/api/encrypt';
import { clearToken, setToken } from '@/api/request';
import { fetchProfileSummary, fetchVipLevels } from '@/api/user';
import { resolveAvatarUrl } from '@/api/upload';

const CUSTOMER_STORAGE_KEY = 'mysport:customer';
let vipLevelsRequest = null;
let userProfileRequest = null;

function formatMoney(value) {
  if (value == null) return '0.00';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeUserProfile(summary = {}) {
  // 接口层只返回原始数据，用户资料的字段兼容与展示格式统一在 store 完成。
  const customer = summary.customer || {};
  const wallet = summary.wallet || {};
  const stats = summary.stats || {};
  const winRate = Number(stats.winRate);
  const profit = Number(stats.profit);
  const vipLevel = customer.vipLevel ?? customer.level ?? 0;

  return {
    ...customer,
    nickname: customer.nickname || customer.username || '',
    memberId: customer.customerNo || '',
    avatarUrl: resolveAvatarUrl(customer.avatar),
    withdrawPasswordSet: customer.withdrawPasswordSet === true,
    balance: formatMoney(wallet.balance),
    frozenBalance: formatMoney(wallet.frozen),
    currency: wallet.currency || 'CNY',
    vipLevel,
    totalBet: formatMoney(stats.totalBet),
    winRate: `${Number.isFinite(winRate) ? winRate.toFixed(1) : '0.0'}%`,
    totalProfit: Number.isFinite(profit)
      ? `${profit >= 0 ? '+' : ''}¥${formatMoney(profit)}`
      : '¥0.00',
    wallet,
    stats,
  };
}

function normalizeUserProfilePatch(profile = {}) {
  const normalized = { ...profile };
  // 局部更新也复用相同展示规则，避免组件自行解析头像和金额。
  if (Object.prototype.hasOwnProperty.call(profile, 'avatar')) {
    normalized.avatarUrl = resolveAvatarUrl(profile.avatar);
  }
  if (Object.prototype.hasOwnProperty.call(profile, 'balance')) {
    normalized.balance = formatMoney(profile.balance);
  }
  return normalized;
}

function loadCachedCustomer() {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistCustomer(customer) {
  if (customer) {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
  } else {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    // localStorage 本身不具备响应式，登录态必须由 store state 承载。
    isLoggedIn: Boolean(localStorage.getItem('mysport:token')),
    customer: loadCachedCustomer(),
    userProfile: null,
    vipLevels: [],
  }),
  getters: {
    loggedInUserId: (state) =>
      state.userProfile?.nickname
      || state.customer?.nickname
      || state.customer?.username
      || state.customer?.customerNo
      || '',
    loggedInAssetsFormatted: (state) =>
      state.userProfile?.balance ?? state.customer?.balance ?? '0.00',
    // Header / 全站头像统一从此读取；无头像时返回空串，由 UI 层兜底默认图。
    loggedInAvatarUrl: (state) => {
      const profile = state.userProfile || state.customer;
      if (!profile) return '';
      if (profile.avatarUrl) return profile.avatarUrl;
      return resolveAvatarUrl(profile.avatar);
    },
    customerId: (state) => {
      const customer = state.userProfile || state.customer;
      return customer?.id || customer?.customerId || customer?.customerNo || null;
    },
    // 对外统一提供按等级升序排列后的列表，调用处不需要重复处理接口顺序。
    vipLevelList: (state) =>
      [...state.vipLevels]
        .filter((item) => Number.isFinite(Number(item?.level)))
        .sort((a, b) => Number(a.level) - Number(b.level)),
  },
  actions: {
    completeWebLogin(loginVO = {}) {
      const { satoken, accessToken, refreshToken, customer } = loginVO;
      const finalToken = satoken || accessToken;
      if (!finalToken) throw new Error('登录凭证缺失');

      // 新账号登录时原子替换身份资料，避免继承上一账号的缓存。
      setToken(finalToken, refreshToken);
      this.isLoggedIn = true;
      this.customer = customer || null;
      this.userProfile = null;
      persistCustomer(this.customer);
    },
    async loadUserProfile({ force = false } = {}) {
      // 用户资料跨页面复用，已获取时直接读取 store，避免重复请求个人中心接口。
      if (this.userProfile && !force) return this.userProfile;
      if (userProfileRequest && !force) return userProfileRequest;

      userProfileRequest = fetchProfileSummary()
        .then((res) => {
          this.userProfile = normalizeUserProfile(res.data);
          this.customer = { ...(this.customer || {}), ...this.userProfile };
          persistCustomer(this.customer);
          return this.userProfile;
        })
        .finally(() => {
          userProfileRequest = null;
        });

      return userProfileRequest;
    },
    updateUserProfile(profile = {}) {
      // 用户资料及本地缓存由同一个入口更新，避免不同页面维护多份状态。
      const normalizedProfile = normalizeUserProfilePatch(profile);
      this.userProfile = {
        ...(this.userProfile || this.customer || {}),
        ...normalizedProfile,
      };
      this.customer = { ...(this.customer || {}), ...normalizedProfile };
      persistCustomer(this.customer);
      return this.userProfile;
    },
    async refreshUserBalance() {
      // 余额刷新统一复用用户资料接口，并同步内存状态与本地缓存。
      const profile = await this.loadUserProfile({ force: true });
      const balance = profile.balance ?? '0.00';
      this.updateUserProfile({ balance });
      return balance;
    },
    clearWebLogin() {
      const hasToken = Boolean(localStorage.getItem('mysport:token'));
      this.isLoggedIn = false;
      this.customer = null;
      this.userProfile = null;
      userProfileRequest = null;
      // 请求层可能已清除 token 并派发失效事件，避免重复派发造成递归清理。
      if (hasToken) clearToken();
      clearSession();
      persistCustomer(null);
    },
    async loadVipLevels({ force = false } = {}) {
      if (this.vipLevels.length > 0 && !force) return this.vipLevels;
      if (vipLevelsRequest && !force) return vipLevelsRequest;

      vipLevelsRequest = fetchVipLevels()
        .then((res) => {
          const levels = Array.isArray(res.data) ? res.data : [];
          this.vipLevels = levels;
          return levels;
        })
        .finally(() => {
          vipLevelsRequest = null;
        });

      return vipLevelsRequest;
    },
  },
});
