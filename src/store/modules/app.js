import { defineStore } from 'pinia';

import { APP_SETTINGS, RUNTIME_SITE_KEY, THEME_CLASSNAMES } from '@/config/app';
import { getSiteConfig, SITE_PRESETS } from '@/config/site';

export const LOCALE_STORAGE_KEY = 'mysport:locale';
export const SITE_STORAGE_KEY = 'mysport:site-key';
export const SKIN_STORAGE_KEY = 'mysport:skin-key';

export const getCurrentLocale = () =>
  localStorage.getItem(LOCALE_STORAGE_KEY) || APP_SETTINGS.defaultLocale;

// 如果当前是通过 package.json 的模板脚本启动，例如 dev:arena / build:arena，
// 就优先使用脚本传进来的站点 key，确保运行和打包结果稳定落到指定模板。
// 只有在没有显式指定模板时，才回退到本地缓存或默认站点。
export const getCurrentSiteKey = () => {
  if (RUNTIME_SITE_KEY && SITE_PRESETS[RUNTIME_SITE_KEY]) {
    return RUNTIME_SITE_KEY;
  }

  return localStorage.getItem(SITE_STORAGE_KEY) || APP_SETTINGS.defaultSiteKey;
};

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
      // 当站点是由启动脚本锁定时，这里不允许再切到其他模板，
      // 避免“明明运行的是 arena 指令，但页面实际切到了 default”这种混淆。
      if (RUNTIME_SITE_KEY && siteKey !== RUNTIME_SITE_KEY) {
        return;
      }

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
