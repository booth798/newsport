import { defineStore } from 'pinia';

export const LOCALE_STORAGE_KEY = 'mysport:locale';
export const DEFAULT_LOCALE = 'zh-CN';

export const getCurrentLocale = () =>
  localStorage.getItem(LOCALE_STORAGE_KEY) || DEFAULT_LOCALE;

export const useAppStore = defineStore('app', {
  state: () => ({
    locale: getCurrentLocale(),
    viewportWidth: typeof window === 'undefined' ? 1440 : window.innerWidth,
    loginModalOpen: false,
    logoutConfirmOpen: false, // 退出登录确认
    customerServiceConfirmOpen: false, // 联系客服确认
  }),
  getters: {
    isMobile: (state) => state.viewportWidth <= 750,
  },
  actions: {
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
    openLogoutConfirm() {
      this.logoutConfirmOpen = true;
    },
    closeLogoutConfirm() {
      this.logoutConfirmOpen = false;
    },
    openCustomerServiceConfirm() {
      this.customerServiceConfirmOpen = true;
    },
    closeCustomerServiceConfirm() {
      this.customerServiceConfirmOpen = false;
    },
  },
});
