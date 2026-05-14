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
  },
});
