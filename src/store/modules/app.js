import { defineStore } from 'pinia';

export const LOCALE_STORAGE_KEY = 'mysport:locale';
export const DEFAULT_LOCALE = 'zh-CN';

export const getCurrentLocale = () =>
  localStorage.getItem(LOCALE_STORAGE_KEY) || DEFAULT_LOCALE;

export const useAppStore = defineStore('app', {
  state: () => ({
    locale: getCurrentLocale(),
    viewportWidth: typeof window === 'undefined' ? 1440 : window.innerWidth,
    /** 导航「登录」等入口打开的登入/注册弹层 */
    loginModalOpen: false,
    /** PC 顶栏：演示登录成功后的已登录态（无真实鉴权时用于稿图对齐） */
    isLoggedIn: false,
    loggedInUserId: '',
    /** 演示用总资产展示（千分位） */
    loggedInAssetsFormatted: '1,342,512.35',
  }),
  getters: {
    // 项目只区分两套端：
    // 1. <= 750 视为移动端
    // 2. > 750 视为 Web 端
    isMobile: (state) => state.viewportWidth <= 750,
  },
  actions: {
    // 记录当前语言，方便下次打开页面时直接恢复。
    setLocale(locale) {
      this.locale = locale;
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    },
    setViewportWidth(width) {
      this.viewportWidth = width;
    },
    openLoginModal() {
      this.loginModalOpen = true;
    },
    closeLoginModal() {
      this.loginModalOpen = false;
    },
    /**
     * 演示：从登录弹窗提交后写入顶栏展示用信息（后续可接真实登录接口）。
     * @param {string} account
     */
    completeWebLogin(account) {
      const id = String(account ?? '').trim() || '—';
      this.loggedInUserId = id;
      this.isLoggedIn = true;
      this.loginModalOpen = false;
    },
    /** 退出登录态（顶栏恢复访客） */
    clearWebLogin() {
      this.isLoggedIn = false;
      this.loggedInUserId = '';
    },
  },
});
