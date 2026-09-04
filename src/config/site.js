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
  siteName: 'UNIBALL',
  /** 当前域名；勿再写死 api 子域，避免跨域与部署域名不一致 */
  get apiBaseUrl() {
    return resolveApiBaseUrl();
  },
  brandColor: '#0b6bcb',
};
