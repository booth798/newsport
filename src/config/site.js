/**
 * 解析 API 根地址：始终用当前页面域名（同源）。
 * - 生产：由网关把 /api 反代到后端
 * - 开发：Vite 把 /api 代理到后端（见 vite.config.js）
 */
function resolveApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export const SITE_CONFIG = {
  siteName: 'Ladbrokes',
  /** 当前域名；勿再写死 api 子域，避免跨域与部署域名不一致 */
  get apiBaseUrl() {
    return resolveApiBaseUrl();
  },
  brandColor: '#FF0004',
  /**
   * PC「下载 APP」二维码对应链接（占位：百度；上线前换成真实安卓包 / App Store）
   */
  appDownload: {
    android: 'https://www.baidu.com/',
    ios: 'https://www.baidu.com/',
  },
};
