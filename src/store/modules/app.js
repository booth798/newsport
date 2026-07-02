import { defineStore } from 'pinia';
import { setToken, clearToken } from '@/api/request';
import { clearSession } from '@/api/encrypt';

export const LOCALE_STORAGE_KEY = 'mysport:locale';
export const DEFAULT_LOCALE = 'zh-CN';

export const getCurrentLocale = () =>
  localStorage.getItem(LOCALE_STORAGE_KEY) || DEFAULT_LOCALE;

function loadCustomer() {
  try {
    const raw = localStorage.getItem('mysport:customer');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAppStore = defineStore('app', {
  state: () => {
    const saved = loadCustomer();
    const hasToken = Boolean(localStorage.getItem('mysport:token'));
    return {
      locale: getCurrentLocale(),
      viewportWidth: typeof window === 'undefined' ? 1440 : window.innerWidth,
      loginModalOpen: false,
      isLoggedIn: hasToken && Boolean(saved),
      loggedInUserId: saved?.username || '',
      loggedInAssetsFormatted: '0.00',
      customer: saved,
    };
  },
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
    completeWebLogin(loginVO) {
      const { satoken, accessToken, refreshToken, customer } = loginVO;
      setToken(satoken || accessToken, refreshToken);
      this.customer = customer;
      this.loggedInUserId = customer?.username || customer?.customerNo || '';
      this.isLoggedIn = true;
      this.loginModalOpen = false;
      if (customer) {
        localStorage.setItem('mysport:customer', JSON.stringify(customer));
      }
    },
    updateCustomer(customerVO) {
      this.customer = customerVO;
      this.loggedInUserId = customerVO?.username || customerVO?.customerNo || '';
      if (customerVO) {
        localStorage.setItem('mysport:customer', JSON.stringify(customerVO));
      }
    },
    clearWebLogin() {
      this.isLoggedIn = false;
      this.loggedInUserId = '';
      this.loggedInAssetsFormatted = '0.00';
      this.customer = null;
      clearToken();
      clearSession();
      localStorage.removeItem('mysport:customer');
    },
  },
});
