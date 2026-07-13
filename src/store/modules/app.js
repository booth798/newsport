import { defineStore } from 'pinia';

export const LOCALE_STORAGE_KEY = 'mysport:locale';
export const DEFAULT_LOCALE = 'zh-CN';

export const getCurrentLocale = () =>
  localStorage.getItem(LOCALE_STORAGE_KEY) || DEFAULT_LOCALE;

let _publicConfigPromise = null;

export const useAppStore = defineStore('app', {
  state: () => ({
    locale: getCurrentLocale(),
    viewportWidth: typeof window === 'undefined' ? 1440 : window.innerWidth,
    loginModalOpen: false,
    logoutConfirmOpen: false,
    customerServiceConfirmOpen: false,
    publicConfig: {},
  }),
  getters: {
    isMobile: (state) => state.viewportWidth <= 750,
    csUrl: (state) => state.publicConfig['customer-service.url'] || '',
    csHours: (state) => state.publicConfig['customer-service.hours'] || '',
    csQQ: (state) => state.publicConfig['customer-service.qq'] || '',
    csEmail: (state) => state.publicConfig['customer-service.email'] || '',
    brandName: (state) => state.publicConfig['app.brand-name'] || 'UNIBET',
    appCopyright: (state) => state.publicConfig['app.copyright'] || '',
    announcementBanner: (state) => state.publicConfig['announcement.banner'] || '',
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
    async loadPublicConfig({ force = false } = {}) {
      if (!force && Object.keys(this.publicConfig).length > 0) return this.publicConfig;
      if (_publicConfigPromise && !force) return _publicConfigPromise;
      const { fetchPublicConfig } = await import('@/api/match');
      _publicConfigPromise = fetchPublicConfig()
        .then((res) => {
          const data = res.data || {};
          this.publicConfig = data;
          return data;
        })
        .catch(() => ({}))
        .finally(() => { _publicConfigPromise = null; });
      return _publicConfigPromise;
    },
  },
});
