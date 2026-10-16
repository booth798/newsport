import { defineStore } from 'pinia';

import { clearSession, reloadSessionFromStorage } from '@/api/encrypt';
import { clearToken, setToken } from '@/api/request';
import { fetchBalance } from '@/api/finance';
import { fetchProfileSummary, fetchVipLevels } from '@/api/user';
import { resolveAvatarUrl } from '@/api/upload';

const CUSTOMER_STORAGE_KEY = 'mysport:customer';
const TOKEN_STORAGE_KEY = 'mysport:token';
let vipLevelsRequest = null;
let userProfileRequest = null;
let walletRequest = null;
/** 资料 / 钱包请求世代号：换号时作废进行中的旧请求结果 */
let userProfileLoadGen = 0;
let walletLoadGen = 0;
/** 本页最近同步过的 token，用于识别他页换号 / 退出 */
let lastSyncedToken = localStorage.getItem(TOKEN_STORAGE_KEY) || '';

function formatMoney(value) {
  // 金额展示对齐安卓 AppTools.formatAmount：Locale.US 千分位 + 固定两位小数。
  if (value == null || value === '') return '0.00';
  // 兼容已格式化字符串（如 "1,234.56"），避免二次 Number 成 NaN 后显示 0.00。
  const amount = Number(String(value).replace(/,/g, '').replace(/[¥+\s]/g, ''));
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** WalletVO 展示口径：balance=主钱包，frozen=锁定钱包，available=账户余额 */
function walletDisplayPatch(wallet = {}, fallbackCurrency = 'CNY') {
  return {
    // 主钱包
    balance: formatMoney(wallet.balance),
    // 账户余额
    availableBalance: formatMoney(wallet.available ?? wallet.balance),
    // 锁定钱包
    frozenBalance: formatMoney(wallet.frozen),
    currency: wallet.currency || fallbackCurrency,
    wallet,
  };
}

function normalizeUserProfile(summary = {}, previous = {}) {
  // 接口层只返回原始数据，用户资料的字段兼容与展示格式统一在 store 完成。
  // 钱包字段不在此写入：与安卓一致，统一由 GET /wallet（refreshUserBalance）负责。
  const customer = summary.customer || {};
  const stats = summary.stats || {};
  const winRate = Number(stats.winRate);
  const profit = Number(stats.profit);
  const vipLevel = customer.vipLevel ?? customer.level ?? 0;

  return {
    ...previous,
    ...customer,
    nickname: customer.nickname || customer.username || '',
    memberId: customer.customerNo || '',
    avatarUrl: resolveAvatarUrl(customer.avatar),
    withdrawPasswordSet: customer.withdrawPasswordSet === true,
    // 保留已有钱包展示，避免资料接口覆盖刷新后的余额。
    balance: previous.balance ?? '0.00',
    availableBalance: previous.availableBalance ?? '0.00',
    frozenBalance: previous.frozenBalance ?? '0.00',
    currency: previous.currency || 'CNY',
    wallet: previous.wallet || {},
    vipLevel,
    totalBet: formatMoney(stats.totalBet),
    winRate: `${Number.isFinite(winRate) ? winRate.toFixed(1) : '0.0'}%`,
    totalProfit: Number.isFinite(profit)
      ? `${profit >= 0 ? '+' : ''}${formatMoney(profit)}`
      : '0.00',
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
  if (Object.prototype.hasOwnProperty.call(profile, 'available')
    || Object.prototype.hasOwnProperty.call(profile, 'availableBalance')) {
    normalized.availableBalance = formatMoney(profile.available ?? profile.availableBalance);
  }
  if (Object.prototype.hasOwnProperty.call(profile, 'frozen')
    || Object.prototype.hasOwnProperty.call(profile, 'frozenBalance')) {
    normalized.frozenBalance = formatMoney(profile.frozen ?? profile.frozenBalance);
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
    // Header / 提现 / 买入等可用额度取主钱包 balance
    loggedInAssetsFormatted: (state) =>
      state.userProfile?.balance
      ?? state.customer?.balance
      ?? '0.00',
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
      lastSyncedToken = finalToken;
      this.isLoggedIn = true;
      this.customer = customer || null;
      this.userProfile = null;
      userProfileRequest = null;
      walletRequest = null;
      persistCustomer(this.customer);
    },
    async loadUserProfile({ force = false } = {}) {
      // 用户资料跨页面复用；钱包与安卓一样始终走独立 GET /wallet。
      if (this.userProfile && !force) return this.userProfile;
      if (userProfileRequest && !force) return userProfileRequest;

      const loadGen = ++userProfileLoadGen;
      userProfileRequest = (async () => {
        const res = await fetchProfileSummary();
        // 换号后旧请求回包丢弃，避免串号覆盖
        if (loadGen !== userProfileLoadGen) return this.userProfile;
        // force 换号后勿沿用上一账号 previous，避免昵称/余额串号
        const previous = force ? (this.customer || {}) : (this.userProfile || this.customer || {});
        this.userProfile = normalizeUserProfile(res.data, previous);
        this.customer = { ...(this.customer || {}), ...this.userProfile };
        persistCustomer(this.customer);
        // 首次拉资料时同步拉钱包，保证 Header 等处也能拿到余额。
        await this.refreshUserBalance().catch(() => {});
        return this.userProfile;
      })().finally(() => {
        if (loadGen === userProfileLoadGen) userProfileRequest = null;
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
      // 对齐安卓 MineFragment.loadWalletData / refreshWallet：只拉 GET /wallet。
      if (walletRequest) return walletRequest;

      const loadGen = ++walletLoadGen;
      walletRequest = (async () => {
        const res = await fetchBalance();
        if (loadGen !== walletLoadGen) return this.userProfile?.balance ?? '0.00';
        const wallet = res?.data || {};
        const patch = walletDisplayPatch(
          wallet,
          this.userProfile?.currency || this.customer?.currency || 'CNY',
        );
        // 直接写入已格式化字段，避免再走 formatMoney 二次处理。
        this.userProfile = {
          ...(this.userProfile || this.customer || {}),
          ...patch,
        };
        this.customer = { ...(this.customer || {}), ...patch };
        persistCustomer(this.customer);
        return this.userProfile?.balance ?? '0.00';
      })().finally(() => {
        if (loadGen === walletLoadGen) walletRequest = null;
      });

      return walletRequest;
    },
    /**
     * @param {{ syncOnly?: boolean }} [opts]
     * syncOnly：他页已改写 localStorage，本页只清内存，避免再清掉新账号会话。
     */
    clearWebLogin({ syncOnly = false } = {}) {
      this.isLoggedIn = false;
      this.customer = null;
      this.userProfile = null;
      userProfileRequest = null;
      walletRequest = null;
      if (syncOnly) {
        lastSyncedToken = '';
        return;
      }
      const hasToken = Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
      // 请求层可能已清除 token 并派发失效事件，避免重复派发造成递归清理。
      if (hasToken) clearToken();
      lastSyncedToken = '';
      clearSession();
      persistCustomer(null);
    },
    /**
     * 多标签：对齐 localStorage 中的最新登录态（换号 / 退出）。
     * @returns {Promise<'logout'|'switch'|'noop'>}
     */
    async syncAuthFromStorage() {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY) || '';
      if (token === lastSyncedToken) {
        // token 未变时仍同步 customer 缓存（他页可能只刷新了余额）
        if (token && this.isLoggedIn) {
          const cached = loadCachedCustomer();
          if (cached) {
            this.customer = { ...(this.customer || {}), ...cached };
            if (this.userProfile) {
              this.userProfile = { ...this.userProfile, ...cached };
            }
          }
        }
        return 'noop';
      }

      lastSyncedToken = token;
      // 作废进行中的旧账号请求
      userProfileLoadGen += 1;
      walletLoadGen += 1;
      userProfileRequest = null;
      walletRequest = null;
      // 加密会话跟 storage 对齐，避免仍用旧 sid/aesKey 请求
      await reloadSessionFromStorage().catch(() => {});

      if (!token) {
        this.clearWebLogin({ syncOnly: true });
        return 'logout';
      }

      // 换号：先落地新 customer 缓存，再强制重拉资料与钱包
      this.isLoggedIn = true;
      this.customer = loadCachedCustomer();
      this.userProfile = null;
      try {
        await this.loadUserProfile({ force: true });
      } catch { /* 资料失败仍保留登录态与缓存 customer */ }
      return 'switch';
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
