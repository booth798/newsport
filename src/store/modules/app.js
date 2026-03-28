import { defineStore } from 'pinia';

import { APP_SETTINGS, THEME_CLASSNAMES } from '@/config/app';
import { getSiteConfig, SITE_PRESETS } from '@/config/site';

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
  },
  actions: {
    // 记录当前语言，方便下次打开页面时直接恢复。
    setLocale(locale) {
      this.locale = locale;
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    },
    // 切换站点后，图片、接口地址和页面标题都会跟着当前站点走。
    setSiteKey(siteKey) {
      if (!SITE_PRESETS[siteKey]) {
        return;
      }

      this.siteKey = siteKey;
      localStorage.setItem(SITE_STORAGE_KEY, siteKey);
    },
    // 皮肤现在只是一组 html 主题类名，因此这里仅保存一个简单的 key。
    setSkinKey(skinKey) {
      if (!THEME_CLASSNAMES.includes(skinKey)) {
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

