import { defineStore } from 'pinia';

import { APP_SETTINGS } from '@/config/app';
import { getSkinConfig, getSkinOptions, isValidSkin } from '@/config/skin';
import { getSiteConfig, getSiteOptions, SITE_PRESETS } from '@/config/site';

export const LOCALE_STORAGE_KEY = 'mysport:locale';
export const SITE_STORAGE_KEY = 'mysport:site-key';
export const SKIN_STORAGE_KEY = 'mysport:skin-key';

export const getCurrentLocale = () =>
  localStorage.getItem(LOCALE_STORAGE_KEY) || APP_SETTINGS.defaultLocale;

export const getCurrentSiteKey = () =>
  localStorage.getItem(SITE_STORAGE_KEY) || APP_SETTINGS.defaultSiteKey;

export const getCurrentSkinKey = () =>
  localStorage.getItem(SKIN_STORAGE_KEY) || APP_SETTINGS.defaultSkinKey;

export const useAppStore = defineStore('app', {
  state: () => ({
    locale: getCurrentLocale(),
    siteKey: getCurrentSiteKey(),
    skinKey: getCurrentSkinKey(),
    viewportWidth: typeof window === 'undefined' ? 1440 : window.innerWidth,
  }),
  getters: {
    isMobile: (state) => state.viewportWidth < 768,
    currentSite: (state) => getSiteConfig(state.siteKey),
    currentSkin: (state) => getSkinConfig(state.skinKey),
    siteOptions: () => getSiteOptions(),
    skinOptions: () => getSkinOptions(),
    previewEnabled: () => APP_SETTINGS.sitePreviewEnabled,
  },
  actions: {
    setLocale(locale) {
      this.locale = locale;
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    },
    // 站点切换只影响站点配置和站点图片，不再改动全局皮肤状态。
    setSiteKey(siteKey) {
      if (!SITE_PRESETS[siteKey]) {
        return;
      }

      this.siteKey = siteKey;
      localStorage.setItem(SITE_STORAGE_KEY, siteKey);
    },
    setSkinKey(skinKey) {
      if (!isValidSkin(skinKey)) {
        return;
      }

      this.skinKey = skinKey;
      localStorage.setItem(SKIN_STORAGE_KEY, skinKey);
    },
    setViewportWidth(width) {
      this.viewportWidth = width;
    },
  },
});

