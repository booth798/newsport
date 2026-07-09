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
      logoutConfirmOpen: false,
      isLoggedIn: hasToken && Boolean(saved),
      loggedInUserId: saved?.nickname || saved?.username || '',
      loggedInAssetsFormatted: saved?.balance || '0.00',
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
    openLogoutConfirm() {
      this.logoutConfirmOpen = true;
    },
    closeLogoutConfirm() {
      this.logoutConfirmOpen = false;
    },
    completeWebLogin(loginVO) {
      const { satoken, accessToken, refreshToken, customer } = loginVO;
      const finalToken = satoken || accessToken;
      if (import.meta.env.DEV) {
        console.log(
          '%c[AUTH] completeWebLogin',
          'background:#4caf50;color:#fff;padding:2px 6px;border-radius:3px',
          {
            satoken: satoken ? `${satoken.slice(0, 16)}…` : '(空)',
            accessToken: accessToken ? `${accessToken.slice(0, 16)}…` : '(空)',
            finalToken: finalToken ? `${finalToken.slice(0, 16)}…` : '(空!)',
            refreshToken: refreshToken ? `${refreshToken.slice(0, 16)}…` : '(空)',
            hasCustomer: Boolean(customer),
          },
        );
      }
      setToken(finalToken, refreshToken);
      this.customer = customer;
      this.loggedInUserId = customer?.nickname || customer?.username || customer?.customerNo || '';
      this.isLoggedIn = true;
      this.loginModalOpen = false;
      if (customer) {
        localStorage.setItem('mysport:customer', JSON.stringify(customer));
      }
    },
    updateCustomer(customerVO) {
      this.customer = customerVO;
      this.loggedInUserId = customerVO?.nickname || customerVO?.username || customerVO?.customerNo || '';
      if (customerVO) {
        localStorage.setItem('mysport:customer', JSON.stringify(customerVO));
      }
    },
    updateProfile({ nickname, balance } = {}) {
      if (nickname != null) {
        this.loggedInUserId = nickname;
        if (this.customer) {
          this.customer = { ...this.customer, nickname };
          localStorage.setItem('mysport:customer', JSON.stringify(this.customer));
        }
      }
      if (balance != null) {
        this.loggedInAssetsFormatted = balance;
        if (this.customer) {
          this.customer = { ...this.customer, balance };
          localStorage.setItem('mysport:customer', JSON.stringify(this.customer));
        }
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
